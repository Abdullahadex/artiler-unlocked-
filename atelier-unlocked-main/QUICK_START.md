# 🚀 Quick Start Guide

## ✅ Step 1: Dependencies Installed

Dependencies have been installed successfully!

## 📝 Step 2: Environment Variables Setup

### Option A: Manual Setup (Recommended)

1. **Open `.env.local` file** in the root directory
2. **Fill in the following required values:**

#### Minimum Required (App will run):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

#### For Full Functionality:
```env
# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@atelier.com

# Sentry (for error tracking - optional)
NEXT_PUBLIC_SENTRY_DSN=https://...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Secret (generate random string)
CRON_SECRET=your_random_secret_here
```

### Option B: Use the Template

If `.env.local` doesn't exist or you want to start fresh:

1. The file `.env.local` should already exist
2. If not, copy the template structure from `ENV_SETUP_GUIDE.md`
3. Fill in your actual values

## 🔑 Where to Get API Keys

### Supabase (Required)
1. Go to https://supabase.com
2. Create account → New Project
3. Go to: Settings → API
4. Copy URL and anon key

### Stripe (For Payments)
1. Go to https://stripe.com
2. Sign up → Dashboard
3. Go to: Developers → API keys
4. Use **Test mode** keys for development

### Gmail SMTP (For Emails)
1. Enable 2FA on Gmail
2. Go to: Google Account → Security → App passwords
3. Generate app password
4. Use: `smtp.gmail.com:587`

### Sentry (Optional)
1. Go to https://sentry.io
2. Create account → New Project (Next.js)
3. Copy DSN from project settings

## 🧪 Step 3: Test Your Setup

### Start Development Server:
```bash
npm run dev
```

### Test Basic Functionality:
1. Visit http://localhost:3000
2. Try to sign up (tests Supabase)
3. Create an auction (tests database)
4. Place a bid (tests Stripe if configured)

## ⚠️ Important Notes

1. **Never commit `.env.local` to git** - It's already in `.gitignore`
2. **Use test keys for development** - Don't use live/production keys locally
3. **Restart dev server** after changing environment variables
4. **Check `ENV_SETUP_GUIDE.md`** for detailed instructions

## 📚 Next Steps

1. ✅ Dependencies installed
2. ⏳ Fill in `.env.local` with your API keys
3. ⏳ Run database migrations (see `PRODUCTION_SETUP.md`)
4. ⏳ Start dev server: `npm run dev`
5. ⏳ Test the application

## 🆘 Need Help?

- **Detailed setup:** See `ENV_SETUP_GUIDE.md`
- **Production setup:** See `PRODUCTION_SETUP.md`
- **Troubleshooting:** Check the guides above

---

**Current Status:**
- ✅ Dependencies: Installed
- ⏳ Environment Variables: Need to be filled in
- ⏳ Database: Need to run migrations
- ⏳ Ready to test: After env vars are set

