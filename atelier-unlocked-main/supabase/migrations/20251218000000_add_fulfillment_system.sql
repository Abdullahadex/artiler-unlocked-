-- Fulfillment System Migration
-- Adds shipping addresses and fulfillment tracking

-- Create shipping addresses table
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id) -- One shipping address per auction
);

-- Add fulfillment status to auctions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'fulfillment_status'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN fulfillment_status TEXT DEFAULT 'pending_payment';
    -- Values: 'pending_payment', 'payment_received', 'address_collected', 'shipped', 'delivered', 'completed'
  END IF;
END $$;

-- Add winner_id to auctions to track who won
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'winner_id'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN winner_id UUID REFERENCES public.profiles(id);
  END IF;
END $$;

-- Add payment_intent_id to track Stripe payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'payment_intent_id'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN payment_intent_id TEXT;
  END IF;
END $$;

-- Add shipping tracking number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN tracking_number TEXT;
  END IF;
END $$;

-- Add shipped_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'shipped_at'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN shipped_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable RLS on shipping_addresses
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipping_addresses
CREATE POLICY "Users can view own shipping addresses"
  ON public.shipping_addresses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipping addresses"
  ON public.shipping_addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipping addresses"
  ON public.shipping_addresses FOR UPDATE
  USING (auth.uid() = user_id);

-- Designers can view shipping addresses for their auctions
CREATE POLICY "Designers can view shipping addresses for their auctions"
  ON public.shipping_addresses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.auctions
      WHERE auctions.id = shipping_addresses.auction_id
      AND auctions.designer_id = auth.uid()
    )
  );

-- Function to update updated_at
CREATE TRIGGER update_shipping_addresses_updated_at
  BEFORE UPDATE ON public.shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_auction_id ON public.shipping_addresses(auction_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_auctions_winner_id ON public.auctions(winner_id);
CREATE INDEX IF NOT EXISTS idx_auctions_fulfillment_status ON public.auctions(fulfillment_status);

