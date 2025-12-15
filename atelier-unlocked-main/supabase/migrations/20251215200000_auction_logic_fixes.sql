-- Function to handle bid placement and update auction
CREATE OR REPLACE FUNCTION public.handle_bid_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_is_new_bidder BOOLEAN;
  v_new_status auction_status;
BEGIN
  -- Get auction details
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = NEW.auction_id;

  -- Validate bid
  IF v_auction.status IN ('SOLD', 'VOID') THEN
    RAISE EXCEPTION 'Cannot place bid on ended auction';
  END IF;

  IF NEW.amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Bid amount must be higher than current price';
  END IF;

  IF NEW.user_id = v_auction.designer_id THEN
    RAISE EXCEPTION 'Designers cannot bid on their own auctions';
  END IF;

  IF v_auction.end_time < NOW() THEN
    RAISE EXCEPTION 'Auction has ended';
  END IF;

  -- Check if this is a new unique bidder
  SELECT NOT EXISTS (
    SELECT 1 FROM auction_bidders
    WHERE auction_id = NEW.auction_id AND user_id = NEW.user_id
  ) INTO v_is_new_bidder;

  -- Update auction current_price
  UPDATE auctions
  SET current_price = NEW.amount
  WHERE id = NEW.auction_id;

  -- If new bidder, add to auction_bidders and increment count
  IF v_is_new_bidder THEN
    INSERT INTO auction_bidders (auction_id, user_id)
    VALUES (NEW.auction_id, NEW.user_id)
    ON CONFLICT (auction_id, user_id) DO NOTHING;

    UPDATE auctions
    SET unique_bidder_count = unique_bidder_count + 1
    WHERE id = NEW.auction_id
    RETURNING * INTO v_auction;

    -- Check if we've reached required bidders and unlock
    IF v_auction.unique_bidder_count >= v_auction.required_bidders 
       AND v_auction.status = 'LOCKED' THEN
      UPDATE auctions
      SET status = 'UNLOCKED'
      WHERE id = NEW.auction_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for bid placement
DROP TRIGGER IF EXISTS on_bid_placed ON bids;
CREATE TRIGGER on_bid_placed
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_bid_placement();

-- Function to handle auction end
CREATE OR REPLACE FUNCTION public.handle_auction_end()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Mark expired UNLOCKED auctions as SOLD
  UPDATE auctions
  SET status = 'SOLD'
  WHERE status = 'UNLOCKED'
    AND end_time < NOW();

  -- Mark expired LOCKED auctions as VOID
  UPDATE auctions
  SET status = 'VOID'
  WHERE status = 'LOCKED'
    AND end_time < NOW();
END;
$$;

-- Function to get highest bidder for an auction
CREATE OR REPLACE FUNCTION public.get_winning_bidder(auction_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_winner UUID;
BEGIN
  SELECT user_id INTO v_winner
  FROM bids
  WHERE auction_id = auction_uuid
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  RETURN v_winner;
END;
$$;

