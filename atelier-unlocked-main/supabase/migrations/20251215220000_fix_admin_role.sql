-- Fix: Add 'admin' role to user_role enum if it doesn't exist
-- This migration is safe to run multiple times

-- Check if admin role exists, if not add it
DO $$
BEGIN
  -- Check if 'admin' is already in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    -- Add 'admin' to the enum
    ALTER TYPE public.user_role ADD VALUE 'admin';
  END IF;
END $$;

