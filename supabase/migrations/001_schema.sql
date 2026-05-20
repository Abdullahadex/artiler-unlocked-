-- ============================================================================
-- ATELIER UNLOCKED: CONSOLIDATED SCHEMA
-- All tables, columns, enums, indexes, storage buckets, and realtime config.
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('collector', 'designer', 'admin');
CREATE TYPE public.auction_status AS ENUM ('LOCKED', 'UNLOCKED', 'SOLD', 'VOID', 'PROPOSED');
CREATE TYPE public.seller_application_status AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- ─── PROFILES ───────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'collector',
  bio TEXT,
  is_waitlisted BOOLEAN NOT NULL DEFAULT true,
  is_authorized_seller BOOLEAN DEFAULT FALSE,
  seller_status seller_application_status DEFAULT 'NONE',
  handshake_code TEXT,
  proof_of_archive_url TEXT,
  archive_portfolio TEXT,
  seller_bio TEXT,
  has_accepted_terms BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AUCTIONS ───────────────────────────────────────────────────────────────
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  designer_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  materials TEXT,
  sizing TEXT,
  start_price INTEGER NOT NULL DEFAULT 0,
  current_price INTEGER NOT NULL DEFAULT 0,
  end_time TIMESTAMPTZ NOT NULL,
  status auction_status NOT NULL DEFAULT 'LOCKED',
  unique_bidder_count INTEGER NOT NULL DEFAULT 0,
  required_bidders INTEGER NOT NULL DEFAULT 3,
  signals_count INT DEFAULT 0,
  priority_until TIMESTAMPTZ,
  provenance_hash UUID DEFAULT gen_random_uuid(),
  escrow_memo TEXT,
  -- Fulfillment
  fulfillment_status TEXT DEFAULT 'pending_payment',
  winner_id UUID REFERENCES public.profiles(id),
  payment_intent_id TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── BIDS ───────────────────────────────────────────────────────────────────
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── AUCTION BIDDERS (Unique Tracker) ───────────────────────────────────────
CREATE TABLE public.auction_bidders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_bid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

-- ─── INTEREST SIGNALS ───────────────────────────────────────────────────────
CREATE TABLE public.interest_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, auction_id)
);

-- ─── COMMUNITY CHAT (Protocol Discourse) ────────────────────────────────────
CREATE TABLE public.protocol_discourse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── ANALYTICS ──────────────────────────────────────────────────────────────
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_properties JSONB DEFAULT '{}',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── SHIPPING ADDRESSES ─────────────────────────────────────────────────────
CREATE TABLE public.shipping_addresses (
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
  UNIQUE(auction_id)
);

-- ─── WAREHOUSE AUDIT LOGS ───────────────────────────────────────────────────
CREATE TABLE public.warehouse_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  old_status public.auction_status,
  new_status public.auction_status NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id)
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_user ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON public.analytics_events(created_at DESC);
CREATE INDEX idx_shipping_addresses_auction_id ON public.shipping_addresses(auction_id);
CREATE INDEX idx_shipping_addresses_user_id ON public.shipping_addresses(user_id);
CREATE INDEX idx_auctions_winner_id ON public.auctions(winner_id);
CREATE INDEX idx_auctions_fulfillment_status ON public.auctions(fulfillment_status);
CREATE INDEX idx_discourse_auction ON public.protocol_discourse(auction_id);
CREATE INDEX idx_discourse_created ON public.protocol_discourse(created_at DESC);

-- ─── ENABLE ROW LEVEL SECURITY ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bidders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_discourse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES: PROFILES ────────────────────────────────────────────────
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ─── RLS POLICIES: AUCTIONS ────────────────────────────────────────────────
CREATE POLICY "Auctions are viewable by everyone"
  ON public.auctions FOR SELECT USING (true);

CREATE POLICY "Authorized designers can create auctions"
  ON public.auctions FOR INSERT
  WITH CHECK (
    auth.uid() = designer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_authorized_seller = true
    )
  );

CREATE POLICY "Designers can update own auctions"
  ON public.auctions FOR UPDATE USING (auth.uid() = designer_id);

CREATE POLICY "Designers can delete own auctions"
  ON public.auctions FOR DELETE USING (auth.uid() = designer_id);

-- ─── RLS POLICIES: BIDS ────────────────────────────────────────────────────
CREATE POLICY "Bids are viewable by everyone"
  ON public.bids FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON public.bids FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── RLS POLICIES: AUCTION BIDDERS ──────────────────────────────────────────
CREATE POLICY "Auction bidders are viewable by everyone"
  ON public.auction_bidders FOR SELECT USING (true);

CREATE POLICY "System can insert auction bidders"
  ON public.auction_bidders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── RLS POLICIES: INTEREST SIGNALS ────────────────────────────────────────
CREATE POLICY "Users can view all interest signals"
  ON public.interest_signals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can signal interest once"
  ON public.interest_signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── RLS POLICIES: DISCOURSE ────────────────────────────────────────────────
CREATE POLICY "Discourse is visible to all authenticated nodes"
  ON public.protocol_discourse FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authorized nodes can transmit discourse"
  ON public.protocol_discourse FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── RLS POLICIES: ANALYTICS ───────────────────────────────────────────────
CREATE POLICY "Admins can view analytics"
  ON public.analytics_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "System can insert analytics"
  ON public.analytics_events FOR INSERT WITH CHECK (true);

-- ─── RLS POLICIES: SHIPPING ADDRESSES ──────────────────────────────────────
CREATE POLICY "Users can view own shipping addresses"
  ON public.shipping_addresses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shipping addresses"
  ON public.shipping_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shipping addresses"
  ON public.shipping_addresses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Designers can view shipping for their auctions"
  ON public.shipping_addresses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.auctions
    WHERE auctions.id = shipping_addresses.auction_id AND auctions.designer_id = auth.uid()
  ));

-- ─── RLS POLICIES: AUDIT LOGS ──────────────────────────────────────────────
CREATE POLICY "Admins can view audit logs"
  ON public.warehouse_audit_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ─── STORAGE BUCKETS ────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('auction-images', 'auction-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('handshake-proofs', 'handshake-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage: Auction Images (Public)
CREATE POLICY "Anyone can view auction images"
  ON storage.objects FOR SELECT USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload auction images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'auction-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own auction images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'auction-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own auction images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'auction-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage: Handshake Proofs (Private)
CREATE POLICY "Users can view own handshake proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'handshake-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all handshake proofs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'handshake-proofs' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated users can upload handshake proofs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'handshake-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own handshake proofs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'handshake-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─── REALTIME ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.protocol_discourse;
