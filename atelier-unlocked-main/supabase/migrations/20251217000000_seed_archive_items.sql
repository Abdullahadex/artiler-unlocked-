-- Seed Archive Items (Strategy 1: The Archive)
-- This migration populates The Floor with beautiful sold items to create FOMO and establish value
-- These items are clearly marked as SOLD and serve as reference archive pieces

-- First, add a designer_name column to auctions table if it doesn't exist
-- This allows different designer names to be displayed per auction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'auctions' 
    AND column_name = 'designer_name'
  ) THEN
    ALTER TABLE public.auctions ADD COLUMN designer_name TEXT;
    RAISE NOTICE 'Added designer_name column to auctions table';
  END IF;
END $$;

-- Note: This migration requires at least one profile to exist in the database.
-- Each archive item will have a different designer_name stored in the auctions table.

DO $$
DECLARE
  base_profile_id UUID;
  designer_names TEXT[] := ARRAY[
    'Dior Archive',
    'Chanel Archive', 
    'YSL Archive',
    'Versace Archive',
    'McQueen Archive',
    'Balenciaga Archive',
    'Gucci Archive',
    'Prada Archive',
    'Hermès Archive'
  ];
  auction_ids UUID[];
BEGIN
  -- Get a base profile to work with (needed for foreign key constraints)
  SELECT id INTO base_profile_id
  FROM public.profiles
  LIMIT 1;

  -- If no profile exists, raise an error
  IF base_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profiles found. Please create at least one user account before running this migration. You can sign up at /auth to create a profile.';
  END IF;

  -- Update base profile to be a designer
  UPDATE public.profiles
  SET role = 'designer', display_name = 'Archive Collection'
  WHERE id = base_profile_id;

  -- Insert archive (SOLD) items with different designer names
  -- Each item has a designer_name field that will display instead of the profile name
  
  INSERT INTO public.auctions (
    designer_id,
    designer_name,
    title,
    description,
    images,
    materials,
    sizing,
    start_price,
    current_price,
    end_time,
    status,
    unique_bidder_count,
    required_bidders,
    created_at
  ) VALUES
  -- Archive Item 1: Vintage Dior
  (
    base_profile_id,
    'Dior Archive',
    'Vintage Dior 1999 Evening Gown (Archive)',
    'An exquisite vintage Dior evening gown from the 1999 collection. This piece represents the pinnacle of haute couture craftsmanship, featuring hand-embroidered details and luxurious silk fabric. Sold to a private collector.',
    ARRAY['/placeholder.svg'],
    'Silk, Hand-embroidered beads, Swarovski crystals',
    'One size (Haute Couture)',
    800,
    2400,
    NOW() - INTERVAL '7 days',
    'SOLD',
    5,
    3,
    NOW() - INTERVAL '14 days'
  ),
  -- Archive Item 2: Chanel Suit
  (
    base_profile_id,
    'Chanel Archive',
    'Chanel Tweed Suit 2005 (Archive)',
    'A classic Chanel tweed suit from the 2005 collection. This iconic piece embodies timeless elegance and represents one of the most sought-after items in luxury fashion history.',
    ARRAY['/placeholder.svg'],
    'Wool tweed, Silk lining, Gold buttons',
    'Size 38 (French)',
    1200,
    3200,
    NOW() - INTERVAL '5 days',
    'SOLD',
    7,
    3,
    NOW() - INTERVAL '12 days'
  ),
  -- Archive Item 3: Yves Saint Laurent
  (
    base_profile_id,
    'YSL Archive',
    'YSL Le Smoking Tuxedo 1975 (Archive)',
    'A rare Yves Saint Laurent "Le Smoking" tuxedo from 1975. This revolutionary piece changed women''s fashion forever. Acquired by a museum collection.',
    ARRAY['/placeholder.svg'],
    'Wool, Silk satin lapels, Hand-tailored',
    'Size 36 (French)',
    1500,
    4500,
    NOW() - INTERVAL '10 days',
    'SOLD',
    9,
    3,
    NOW() - INTERVAL '18 days'
  ),
  -- Archive Item 4: Versace
  (
    base_profile_id,
    'Versace Archive',
    'Versace Baroque Print Dress 1992 (Archive)',
    'A stunning Versace baroque print dress from the iconic 1992 collection. This piece showcases the bold, opulent aesthetic that defined the era.',
    ARRAY['/placeholder.svg'],
    'Silk, Baroque print, Gold hardware',
    'Size 40 (Italian)',
    900,
    2800,
    NOW() - INTERVAL '3 days',
    'SOLD',
    6,
    3,
    NOW() - INTERVAL '9 days'
  ),
  -- Archive Item 5: Alexander McQueen
  (
    base_profile_id,
    'McQueen Archive',
    'McQueen Skull Scarf Dress 2003 (Archive)',
    'An avant-garde Alexander McQueen piece featuring the iconic skull motif. This dress represents the designer''s unique vision and technical mastery.',
    ARRAY['/placeholder.svg'],
    'Silk chiffon, Embroidered skulls, Leather accents',
    'Size 38 (UK)',
    1100,
    3600,
    NOW() - INTERVAL '8 days',
    'SOLD',
    8,
    3,
    NOW() - INTERVAL '15 days'
  ),
  -- Archive Item 6: Balenciaga
  (
    base_profile_id,
    'Balenciaga Archive',
    'Balenciaga Hourglass Coat 2019 (Archive)',
    'A modern Balenciaga hourglass coat from the 2019 collection. This piece demonstrates the brand''s innovative approach to silhouette and structure.',
    ARRAY['/placeholder.svg'],
    'Wool blend, Structured shoulders, Oversized fit',
    'Size M (Unisex)',
    1300,
    2900,
    NOW() - INTERVAL '6 days',
    'SOLD',
    5,
    3,
    NOW() - INTERVAL '11 days'
  ),
  -- Archive Item 7: Gucci
  (
    base_profile_id,
    'Gucci Archive',
    'Gucci Floral Print Jumpsuit 2017 (Archive)',
    'A vibrant Gucci floral print jumpsuit from the 2017 collection. This piece captures the brand''s maximalist aesthetic and Italian craftsmanship.',
    ARRAY['/placeholder.svg'],
    'Silk, Floral print, Gold zipper',
    'Size 40 (Italian)',
    850,
    2200,
    NOW() - INTERVAL '4 days',
    'SOLD',
    4,
    3,
    NOW() - INTERVAL '8 days'
  ),
  -- Archive Item 8: Prada
  (
    base_profile_id,
    'Prada Archive',
    'Prada Nylon Backpack Dress 2000 (Archive)',
    'A revolutionary Prada piece combining utilitarian nylon with high fashion. This dress represents the brand''s innovative material experimentation.',
    ARRAY['/placeholder.svg'],
    'Nylon, Technical fabric, Minimalist design',
    'Size 38 (Italian)',
    700,
    1800,
    NOW() - INTERVAL '9 days',
    'SOLD',
    5,
    3,
    NOW() - INTERVAL '13 days'
  ),
  -- Archive Item 9: Hermès
  (
    base_profile_id,
    'Hermès Archive',
    'Hermès Silk Scarf Dress 2015 (Archive)',
    'An elegant Hermès dress made from repurposed silk scarves. This piece showcases the brand''s commitment to craftsmanship and luxury materials.',
    ARRAY['/placeholder.svg'],
    'Silk, Hand-rolled edges, Artisanal construction',
    'Size 36 (French)',
    1600,
    4100,
    NOW() - INTERVAL '11 days',
    'SOLD',
    7,
    3,
    NOW() - INTERVAL '16 days'
  )
  RETURNING id INTO auction_ids;

  RAISE NOTICE 'Archive items seeded successfully with different designer names.';
  RAISE NOTICE 'IMPORTANT: Only real products should be listed as LOCKED or UNLOCKED auctions.';
  RAISE NOTICE 'The archive items above are clearly marked as SOLD and serve as reference pieces only.';
END $$;
