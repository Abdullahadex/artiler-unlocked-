-- Add role column to profiles table if it doesn't exist
-- This migration is safe to run multiple times

DO $$
BEGIN
  -- Check if role column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Create user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
      CREATE TYPE public.user_role AS ENUM ('collector', 'designer', 'admin');
    END IF;
    
    -- Add role column
    ALTER TABLE public.profiles 
    ADD COLUMN role public.user_role NOT NULL DEFAULT 'collector';
    
    -- Add comment
    COMMENT ON COLUMN public.profiles.role IS 'User role: collector, designer, or admin';
  END IF;
END $$;

