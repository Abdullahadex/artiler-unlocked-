-- Update a specific user's role to admin
-- Replace 'your-email@example.com' with your actual email address

-- Option 1: Update by email (if you know your email)
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Option 2: Update by user ID (if you know your user ID from auth.users)
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'your-user-id-here';

-- Option 3: Update your own profile (run this while logged in)
-- This will update the profile of the currently authenticated user
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = auth.uid();

