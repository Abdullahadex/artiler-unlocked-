-- Create enum for user roles in auctions
CREATE TYPE public.user_role AS ENUM ('collector', 'designer');

-- Create enum for auction status
CREATE TYPE public.auction_status AS ENUM ('LOCKED', 'UNLOCKED', 'SOLD', 'VOID');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'collector',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  designer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bids table
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique bidders tracking table
CREATE TABLE public.auction_bidders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_bid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bidders ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Auctions policies
CREATE POLICY "Auctions are viewable by everyone" 
  ON public.auctions FOR SELECT 
  USING (true);

CREATE POLICY "Designers can create auctions" 
  ON public.auctions FOR INSERT 
  WITH CHECK (auth.uid() = designer_id);

CREATE POLICY "Designers can update own auctions" 
  ON public.auctions FOR UPDATE 
  USING (auth.uid() = designer_id);

CREATE POLICY "Designers can delete own auctions" 
  ON public.auctions FOR DELETE 
  USING (auth.uid() = designer_id);

-- Bids policies
CREATE POLICY "Bids are viewable by everyone" 
  ON public.bids FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can place bids" 
  ON public.bids FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Auction bidders policies
CREATE POLICY "Auction bidders are viewable by everyone" 
  ON public.auction_bidders FOR SELECT 
  USING (true);

CREATE POLICY "System can insert auction bidders" 
  ON public.auction_bidders FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Function to handle new user signup
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

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for auctions and bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- Create storage bucket for auction images
INSERT INTO storage.buckets (id, name, public) VALUES ('auction-images', 'auction-images', true);

-- Storage policies for auction images
CREATE POLICY "Anyone can view auction images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'auction-images');

CREATE POLICY "Authenticated users can upload auction images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'auction-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own auction images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'auction-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own auction images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'auction-images' AND auth.uid()::text = (storage.foldername(name))[1]);