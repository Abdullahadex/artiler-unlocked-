-- ============================================================================
-- ATELIER UNLOCKED: CONSOLIDATED SECURITY & TRIGGERS
-- All functions, triggers, and database-level security enforcement.
-- ============================================================================

-- ─── AUTO-PROFILE CREATION ON SIGNUP ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'collector')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── UPDATED_AT TIMESTAMP TRIGGER ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_auctions_updated_at ON public.auctions;
CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipping_addresses_updated_at ON public.shipping_addresses;
CREATE TRIGGER update_shipping_addresses_updated_at
  BEFORE UPDATE ON public.shipping_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── HANDSHAKE CODE GENERATION ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_handshake_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := 'ATL-';
    i INTEGER;
BEGIN
    result := result || (floor(random() * 90) + 10)::TEXT || '-';
    FOR i IN 1..4 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION public.ensure_handshake_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.handshake_code IS NULL OR NEW.handshake_code = '' THEN
        NEW.handshake_code := public.generate_handshake_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ensure_handshake_code ON public.profiles;
CREATE TRIGGER tr_ensure_handshake_code
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.ensure_handshake_code();

-- ─── BID PLACEMENT LOGIC ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_bid_placement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction RECORD;
  v_is_new_bidder BOOLEAN;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = NEW.auction_id;

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

  SELECT NOT EXISTS (
    SELECT 1 FROM auction_bidders WHERE auction_id = NEW.auction_id AND user_id = NEW.user_id
  ) INTO v_is_new_bidder;

  UPDATE auctions SET current_price = NEW.amount WHERE id = NEW.auction_id;

  IF v_is_new_bidder THEN
    INSERT INTO auction_bidders (auction_id, user_id)
    VALUES (NEW.auction_id, NEW.user_id)
    ON CONFLICT (auction_id, user_id) DO NOTHING;

    UPDATE auctions
    SET unique_bidder_count = unique_bidder_count + 1
    WHERE id = NEW.auction_id
    RETURNING * INTO v_auction;

    IF v_auction.unique_bidder_count >= v_auction.required_bidders AND v_auction.status = 'LOCKED' THEN
      UPDATE auctions SET status = 'UNLOCKED' WHERE id = NEW.auction_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bid_placed ON public.bids;
CREATE TRIGGER on_bid_placed
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.handle_bid_placement();

-- ─── INTEREST SIGNAL COUNTER ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_interest_signal()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auctions SET signals_count = signals_count + 1 WHERE id = NEW.auction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_interest_signal_added ON public.interest_signals;
CREATE TRIGGER on_interest_signal_added
    AFTER INSERT ON public.interest_signals
    FOR EACH ROW EXECUTE FUNCTION public.handle_interest_signal();

-- ─── AUCTION END HANDLER ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_auction_end()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE auctions SET status = 'SOLD' WHERE status = 'UNLOCKED' AND end_time < NOW();
  UPDATE auctions SET status = 'VOID' WHERE status = 'LOCKED' AND end_time < NOW();
END;
$$;

-- ─── GET WINNING BIDDER ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_winning_bidder(auction_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_winner UUID;
BEGIN
  SELECT user_id INTO v_winner FROM bids
  WHERE auction_id = auction_uuid ORDER BY amount DESC, created_at ASC LIMIT 1;
  RETURN v_winner;
END;
$$;

-- ─── REPUTATION SLASHING ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.slash_reputation(user_id UUID, amount INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.profiles
    SET reputation_score = GREATEST(reputation_score - amount, 0)
    WHERE id = user_id;
END;
$$;

-- ─── DESIGNER ROLE CHECK (Auction Insert) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_designer_role()
RETURNS TRIGGER AS $$
DECLARE v_role public.user_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = NEW.designer_id;
  IF v_role IS NULL OR v_role != 'designer' THEN
    RAISE EXCEPTION 'Security Policy Violation: Only users with the designer role can create auctions';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_designer_role ON public.auctions;
CREATE TRIGGER ensure_designer_role
  BEFORE INSERT ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.check_designer_role();

-- ─── AUCTION FIELD PROTECTION ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_auction_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user != 'postgres' AND current_user != 'supabase_admin' THEN
    IF NEW.current_price != OLD.current_price THEN
      RAISE EXCEPTION 'Security Policy Violation: Cannot manually update current_price';
    END IF;
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Security Policy Violation: Cannot manually update status';
    END IF;
    IF NEW.unique_bidder_count != OLD.unique_bidder_count THEN
      RAISE EXCEPTION 'Security Policy Violation: Cannot manually update unique_bidder_count';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_protected_fields_auction ON public.auctions;
CREATE TRIGGER ensure_protected_fields_auction
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.protect_auction_fields();

-- ─── ADMIN AUTH ENFORCEMENT (Profiles) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_admin_auth_v5()
RETURNS TRIGGER AS $$
DECLARE
    req_role TEXT;
    req_user TEXT;
BEGIN
    req_role := COALESCE(auth.role(), 'no_auth_role');
    req_user := COALESCE(current_user, 'no_current_user');

    IF (OLD.role IS DISTINCT FROM NEW.role OR
        OLD.is_authorized_seller IS DISTINCT FROM NEW.is_authorized_seller OR
        OLD.seller_status IS DISTINCT FROM NEW.seller_status OR
        OLD.is_waitlisted IS DISTINCT FROM NEW.is_waitlisted) THEN

        IF (req_role = 'service_role') OR
           (req_user IN ('postgres', 'dashboard_user', 'supabase_admin')) OR
           (req_user = 'authenticator' AND auth.role() = 'service_role') OR
           (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Unauthorized: Only admins can modify user authorization or roles. (Role: %, User: %, UID: %)',
            req_role, req_user, auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_admin_auth ON public.profiles;
CREATE TRIGGER enforce_admin_auth
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.check_admin_auth_v5();

-- ─── BIDDER VERIFICATION (Waitlist Check) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_check_bidder_verification()
RETURNS TRIGGER AS $$
DECLARE is_waitlisted_user BOOLEAN;
BEGIN
    SELECT is_waitlisted INTO is_waitlisted_user FROM public.profiles WHERE id = NEW.user_id;
    IF is_waitlisted_user THEN
        RAISE EXCEPTION 'Account verification required to participate in acquisition.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_bid_verification ON public.bids;
CREATE TRIGGER tr_check_bid_verification
  BEFORE INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_bidder_verification();

-- ─── AUCTION STATUS AUDIT LOG ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_log_auction_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.warehouse_audit_logs (auction_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_auction_status_change ON public.auctions;
CREATE TRIGGER tr_audit_auction_status_change
  AFTER UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_auction_status_change();

-- ─── CHAT RATE LIMITING ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ratelimit_discourse()
RETURNS TRIGGER AS $$
DECLARE recent_count INTEGER;
BEGIN
    SELECT count(*) INTO recent_count
    FROM public.protocol_discourse
    WHERE user_id = auth.uid() AND created_at > now() - interval '30 seconds';

    IF recent_count >= 5 THEN
        RAISE EXCEPTION 'Slow down: You are sending messages too quickly. Please wait a moment.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ratelimit_discourse ON public.protocol_discourse;
CREATE TRIGGER tr_ratelimit_discourse
    BEFORE INSERT ON public.protocol_discourse
    FOR EACH ROW EXECUTE FUNCTION public.ratelimit_discourse();
