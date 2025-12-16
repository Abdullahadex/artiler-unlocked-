# Fix: Authentication Not Working on Netlify

## Quick Fix Steps

### Step 1: Verify Environment Variables in Netlify

1. Go to your Netlify dashboard: https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Verify these two variables exist:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Step 2: If Variables Are Missing

1. Click **"Add variable"**
2. Add `NEXT_PUBLIC_SUPABASE_URL`:
   - **Key:** `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** `https://your-project-id.supabase.co`
   - **Scopes:** Select "Production", "Branch deploys", and "Deploy previews"
3. Click **"Add variable"** again
4. Add `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
   - **Key:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key)
   - **Scopes:** Select "Production", "Branch deploys", and "Deploy previews"

**Where to get these values:**
- Go to https://app.supabase.com
- Select your project
- Go to **Settings** → **API**
- Copy **Project URL** and **anon/public key**

### Step 3: Trigger a New Deploy (CRITICAL!)

After adding/updating environment variables, you MUST trigger a new deploy:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for the build to complete (usually 2-5 minutes)

**Important:** Environment variables are only available to the build AFTER you trigger a new deploy. Simply adding them won't work until you redeploy.

### Step 4: Configure Supabase Redirect URLs

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://your-site-name.netlify.app/**
   https://your-site-name.netlify.app/auth/callback
   ```
   (Replace `your-site-name` with your actual Netlify site name)
5. Under **Site URL**, set:
   ```
   https://your-site-name.netlify.app
   ```
6. Click **Save**

### Step 5: Test

1. Visit your Netlify site
2. Try to sign up or sign in
3. If you still see "Authentication not configured":
   - Check browser console (F12) for error messages
   - Verify environment variables are set correctly (no extra spaces)
   - Make sure you triggered a new deploy after adding variables
   - Check that Supabase redirect URLs are configured

## Common Issues

### Issue: "Authentication not configured" error

**Cause:** Environment variables not set or build happened before variables were added.

**Solution:**
1. Add environment variables in Netlify (Step 2)
2. Trigger a new deploy (Step 3)
3. Wait for build to complete

### Issue: "Invalid redirect URL" error

**Cause:** Supabase doesn't recognize your Netlify URL as a valid redirect.

**Solution:**
1. Add your Netlify URL to Supabase redirect URLs (Step 4)
2. Make sure the URL matches exactly (including `https://`)

### Issue: Variables set but still not working

**Possible causes:**
1. Build happened before variables were added → **Solution:** Trigger a new deploy
2. Variables have extra spaces or quotes → **Solution:** Remove spaces/quotes from values
3. Wrong variable names → **Solution:** Must be exactly `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. Variables set for wrong scope → **Solution:** Set for "Production" scope

### Issue: Works locally but not on Netlify

**Cause:** Local `.env.local` file has variables, but Netlify doesn't.

**Solution:** Add the same variables to Netlify environment variables (they're not automatically synced).

## Verification Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set in Netlify
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set in Netlify
- [ ] Both variables are set for "Production" scope
- [ ] A new deploy was triggered after adding variables
- [ ] Build completed successfully
- [ ] Supabase redirect URLs include your Netlify URL
- [ ] Supabase Site URL is set to your Netlify URL

## Still Not Working?

1. **Check build logs:**
   - Go to **Deploys** tab
   - Click on the latest deploy
   - Check for any errors during build

2. **Check browser console:**
   - Open your site
   - Press F12 to open developer tools
   - Go to **Console** tab
   - Look for error messages

3. **Verify environment variables are accessible:**
   - The auth page will now show a helpful error message if Supabase is not configured
   - This will tell you exactly which variable is missing

4. **Test Supabase connection:**
   - Go to Supabase dashboard
   - Check that your project is active
   - Verify API keys are correct

