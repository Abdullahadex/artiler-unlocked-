# Netlify Deployment Guide

## Prerequisites

1. A GitHub repository with your code pushed
2. A Netlify account (sign up at https://netlify.com)
3. A Supabase project with your database configured

## Step 1: Deploy to Netlify

### Option A: Connect via GitHub (Recommended)

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and authorize Netlify
4. Select your repository: `artiler-unlocked-`
5. Netlify will auto-detect the `netlify.toml` configuration

### Option B: Manual Deploy

1. Build your project locally: `npm run build`
2. Drag and drop the `.next` folder to Netlify dashboard

## Step 2: Configure Build Settings

The `netlify.toml` file should already be configured, but verify these settings in Netlify UI:

**Site settings → Build & deploy → Continuous Deployment → Build settings:**

- **Base directory:** `atelier-unlocked-main`
- **Build command:** `npm install && npm run build`
- **Publish directory:** `.next` (NOT `atelier-unlocked-main/.next`)
- **Functions directory:** `netlify/functions` (if using serverless functions)

## Step 3: Set Environment Variables (CRITICAL)

This is the most important step! Without these, authentication won't work.

### In Netlify Dashboard:

1. Go to **Site settings** → **Environment variables**
2. Click **"Add variable"** and add each of these:

#### Required Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get these:**
- Go to https://app.supabase.com
- Select your project
- Go to **Settings** → **API**
- Copy:
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon/public key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

#### Optional Variables (for full functionality):

```env
NEXT_PUBLIC_APP_URL=https://your-site-name.netlify.app
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@atelier.com
NEXT_PUBLIC_SENTRY_DSN=https://...
CRON_SECRET=your_random_secret
```

### Important Notes:

- **Never commit** `.env.local` to git
- Environment variables in Netlify are **encrypted** and **secure**
- After adding variables, you **must trigger a new deploy** for them to take effect
- You can set different values for **Production**, **Branch deploys**, and **Deploy previews**

## Step 4: Configure Supabase Redirect URLs

This is critical for authentication to work!

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:

```
https://your-site-name.netlify.app/**
https://your-site-name.netlify.app/auth/callback
```

Replace `your-site-name` with your actual Netlify site name.

5. Under **Site URL**, set:
```
https://your-site-name.netlify.app
```

6. Click **Save**

## Step 5: Trigger a New Deploy

After setting environment variables:

1. Go to **Deploys** tab in Netlify
2. Click **"Trigger deploy"** → **"Clear cache and deploy site"**
3. Wait for the build to complete

## Step 6: Verify Deployment

1. Visit your Netlify site URL
2. Try to **sign up** or **sign in**
3. If you see "authentication not configured", check:
   - Environment variables are set correctly
   - You triggered a new deploy after adding variables
   - Supabase redirect URLs are configured

## Troubleshooting

### Error: "Authentication not configured"

**Solution:**
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in Netlify
2. Check that values don't have extra spaces or quotes
3. Trigger a new deploy after adding variables
4. Check browser console for specific error messages

### Error: "Invalid redirect URL"

**Solution:**
1. Add your Netlify URL to Supabase redirect URLs (Step 4)
2. Make sure the URL matches exactly (including `https://`)

### Build Fails

**Solution:**
1. Check build logs in Netlify dashboard
2. Verify `netlify.toml` is in the repository root
3. Ensure `package.json` is in the `atelier-unlocked-main` directory
4. Check that Node version is 18 (`.nvmrc` file should handle this)

### Environment Variables Not Working

**Solution:**
1. Variables must start with `NEXT_PUBLIC_` to be available in the browser
2. After adding variables, you MUST trigger a new deploy
3. Check that variables are set for the correct environment (Production/Branch/Preview)

## Custom Domain Setup (Optional)

1. Go to **Domain settings** in Netlify
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions
4. Update Supabase redirect URLs to include your custom domain

## Monitoring

- **Deploy logs:** Available in the **Deploys** tab
- **Function logs:** Available in **Functions** tab (if using serverless functions)
- **Analytics:** Available in **Analytics** tab (if enabled)

## Support

If you encounter issues:
1. Check the build logs in Netlify dashboard
2. Check browser console for client-side errors
3. Verify all environment variables are set correctly
4. Ensure Supabase redirect URLs are configured

