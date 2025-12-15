# 🚀 Deployment Checklist

## ✅ Pre-Deployment Fixes Applied

All critical deployment issues have been fixed:

1. ✅ **Environment Variable Validation** - All env vars validated with helpful errors
2. ✅ **SMTP Configuration** - Graceful handling if email not configured
3. ✅ **Stripe Configuration** - Proper validation and error handling
4. ✅ **Admin Role** - Added to enum in migrations
5. ✅ **Storage Bucket** - Safe creation with ON CONFLICT
6. ✅ **Error Handling** - Comprehensive error handling throughout

---

## 📋 Pre-Deployment Steps

### 1. Database Migrations ⚠️ REQUIRED

Run these migrations in order in your Supabase SQL Editor:

1. `supabase/migrations/20251215191831_aefb18f4-317b-480c-8129-b4bb894e656d.sql`
   - Creates all tables, enums, policies, triggers
   - Creates storage bucket

2. `supabase/migrations/20251215200000_auction_logic_fixes.sql`
   - Adds bid placement trigger
   - Adds auction end functions

3. `supabase/migrations/20251215210000_analytics_table.sql`
   - Creates analytics_events table

4. `supabase/migrations/20251215220000_fix_admin_role.sql`
   - Ensures admin role exists in enum

**How to run:**
- Go to Supabase Dashboard → SQL Editor
- Copy and paste each migration file
- Run them in order

### 2. Environment Variables ⚠️ REQUIRED

Set these in your hosting platform (Vercel, etc.):

#### Minimum Required:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key_here
```

#### For Full Functionality:
```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_api_key
SMTP_FROM=noreply@yourdomain.com

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://...

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cron
CRON_SECRET=your_random_secret
```

### 3. Stripe Webhook Setup ⚠️ REQUIRED for Payments

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Cron Job Setup ⚠️ REQUIRED for Auto-Ending Auctions

**Vercel:**
- Already configured in `vercel.json`
- Runs every 5 minutes
- Set `CRON_SECRET` in environment variables

**Other Platforms:**
- Set up cron job to call: `GET https://yourdomain.com/api/cron/auction-end`
- Include header: `Authorization: Bearer ${CRON_SECRET}`

### 5. Storage Bucket ⚠️ CHECK

The migration creates the bucket, but verify:
- Go to Supabase Dashboard → Storage
- Check that `auction-images` bucket exists
- Verify policies are set correctly

---

## 🧪 Testing Checklist

Before going live, test:

- [ ] User sign up
- [ ] User sign in
- [ ] Designer uploads auction item
- [ ] Item appears on The Floor
- [ ] User places bid
- [ ] Bid validation works
- [ ] Price updates correctly
- [ ] Protocol unlock works
- [ ] Email notifications (if configured)
- [ ] Payment flow (if Stripe configured)
- [ ] Admin dashboard access
- [ ] Analytics tracking

---

## ⚠️ Known Limitations

### Email in Cron/Webhooks
- Currently logs TODO for email retrieval
- Won't break deployment, but emails won't send from cron/webhooks
- **Solution:** Store email in profiles table or use service role key

### Rate Limiting
- Currently in-memory
- Works fine for single instance
- **For scaling:** Consider Redis-based rate limiting

---

## 🚨 Common Deployment Issues

### Issue: "Missing Supabase environment variables"
**Fix:** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Issue: "Email service not configured"
**Fix:** This is expected if SMTP not set. App will work, emails just won't send.

### Issue: "Payment processing not configured"
**Fix:** Set Stripe keys. App will work, payments just won't process.

### Issue: "Database migration errors"
**Fix:** Run migrations in order. Check if tables/enums already exist.

### Issue: "Storage bucket already exists"
**Fix:** Migration now handles this with ON CONFLICT DO NOTHING.

---

## ✅ Deployment Ready

After completing the checklist above, your app is ready for production!

**Status:**
- ✅ All critical fixes applied
- ✅ Error handling in place
- ✅ Graceful degradation for optional services
- ✅ Environment validation
- ⏳ Waiting for: Migrations + Environment variables

---

## 📚 Documentation

- `DEPLOYMENT_ISSUES.md` - Issues found
- `DEPLOYMENT_FIXES_APPLIED.md` - Fixes applied
- `PRODUCTION_SETUP.md` - Complete setup guide
- `ENV_SETUP_GUIDE.md` - Environment variables guide

