-- Cleanup Migration: Remove fake items and fix designer names
-- This migration:
-- 1. Adds designer_name column if it doesn't exist
-- 2. Removes any fake/dummy LOCKED items that shouldn't be biddable
-- 3. Updates archive items to have proper designer_name values

-- First, ensure designer_name column exists
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

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Remove any fake LOCKED items that are example/dummy items
  -- These are items that were created for seeding but aren't real products
  DELETE FROM public.auctions
  WHERE status = 'LOCKED'
    AND (
      title ILIKE '%Awaiting Unlock%' OR
      title ILIKE '%Seeking Interest%' OR
      title ILIKE '%Unlock Through Desire%' OR
      title ILIKE '%Minimalist Silk Blouse%' OR
      title ILIKE '%Vintage-Inspired Leather Jacket%' OR
      title ILIKE '%Artisanal Cashmere Coat%'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Removed % fake LOCKED item(s) from The Floor', deleted_count;

  -- Update archive items to have proper designer_name values
  -- Use a single UPDATE with CASE to avoid conflicts
  -- Order matters: more specific matches first
  
  UPDATE public.auctions
  SET designer_name = CASE
    WHEN title ILIKE '%YSL%' OR title ILIKE '%Yves Saint Laurent%' OR title ILIKE '%Le Smoking%' THEN 'YSL Archive'
    WHEN title ILIKE '%McQueen%' OR title ILIKE '%Mc Queen%' THEN 'McQueen Archive'
    WHEN title ILIKE '%Hermès%' OR title ILIKE '%Hermes%' THEN 'Hermès Archive'
    WHEN title ILIKE '%Dior%' THEN 'Dior Archive'
    WHEN title ILIKE '%Chanel%' THEN 'Chanel Archive'
    WHEN title ILIKE '%Versace%' THEN 'Versace Archive'
    WHEN title ILIKE '%Balenciaga%' THEN 'Balenciaga Archive'
    WHEN title ILIKE '%Gucci%' THEN 'Gucci Archive'
    WHEN title ILIKE '%Prada%' THEN 'Prada Archive'
    ELSE designer_name
  END
  WHERE status = 'SOLD' 
    AND (
      designer_name IS NULL 
      OR designer_name = '' 
      OR designer_name ILIKE '%steve%'
      OR designer_name ILIKE '%Archive Collection%'
    )
    AND (
      title ILIKE '%Dior%' OR
      title ILIKE '%Chanel%' OR
      title ILIKE '%YSL%' OR
      title ILIKE '%Yves Saint Laurent%' OR
      title ILIKE '%Le Smoking%' OR
      title ILIKE '%Versace%' OR
      title ILIKE '%McQueen%' OR
      title ILIKE '%Mc Queen%' OR
      title ILIKE '%Balenciaga%' OR
      title ILIKE '%Gucci%' OR
      title ILIKE '%Prada%' OR
      title ILIKE '%Hermès%' OR
      title ILIKE '%Hermes%'
    );

  RAISE NOTICE 'Updated archive items with proper designer names';
  
  -- Show summary
  RAISE NOTICE 'Cleanup complete. Archive items now have proper designer names.';
END $$;

