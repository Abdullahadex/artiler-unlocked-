-- ============================================================================
-- ATELIER UNLOCKED: MIGRATION 002
-- Hardening RLS on the Auctions table to prevent waitlisted users from viewing
-- live auctions via direct API queries.
-- ============================================================================

-- Drop the old overly permissive policy
DROP POLICY IF EXISTS "Auctions are viewable by everyone" ON public.auctions;

-- Create the new hardened policy
CREATE POLICY "Auctions viewable based on waitlist status"
  ON public.auctions FOR SELECT
  USING (
    status = 'PROPOSED' OR
    designer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_waitlisted = false
    )
  );
