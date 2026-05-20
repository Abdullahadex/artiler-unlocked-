-- ============================================================================
-- ATELIER UNLOCKED: SEED DATA
-- Run AFTER schema and security are in place.
-- Generates handshake codes for any existing users.
-- ============================================================================

-- Backfill handshake codes for any existing profiles missing one
UPDATE public.profiles
SET handshake_code = public.generate_handshake_code()
WHERE handshake_code IS NULL OR handshake_code = '';

-- ─── ADMIN ASSIGNMENT ───────────────────────────────────────────────────────
-- Replace 'your-email@example.com' with the actual admin email.
-- Run this manually in the Supabase SQL Editor after your first sign-up.
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'your-email@example.com'
-- );
