# Cron Job Setup Guide

## Vercel Hobby Plan Limitation

**Issue:** Vercel Hobby plan only allows **daily cron jobs** (runs once per day maximum).

**Solution:** Updated cron schedule to run once daily at midnight UTC.

## Current Configuration

**Schedule:** `0 0 * * *` (runs daily at 00:00 UTC / midnight)

This will:
- Check for expired auctions once per day
- Mark UNLOCKED auctions as SOLD
- Mark LOCKED auctions as VOID
- Send winner notifications

## Alternative Options

### Option 1: Keep Daily Schedule (Current)
- ✅ Works on Hobby plan
- ✅ Free
- ⚠️ Auctions end up to 24 hours after expiration

### Option 2: Upgrade to Pro Plan
- Allows more frequent cron jobs
- Can run every 5 minutes: `*/5 * * * *`
- More accurate auction ending times

### Option 3: Use Supabase Edge Functions
- Create a Supabase Edge Function
- Use Supabase's pg_cron extension
- Can run more frequently
- Free tier available

### Option 4: External Cron Service
- Use services like:
  - cron-job.org (free)
  - EasyCron (free tier)
  - GitHub Actions (free)
- Call your API endpoint: `https://yourdomain.com/api/cron/auction-end`
- Include header: `Authorization: Bearer ${CRON_SECRET}`

## Recommended Setup for Production

For production with frequent auction endings:

1. **Upgrade to Vercel Pro** (if budget allows)
   - More frequent cron jobs
   - Better performance
   - More features

2. **OR Use Supabase Edge Function** (Free alternative)
   - Create edge function
   - Use pg_cron for scheduling
   - More control

3. **OR Use External Cron Service** (Free)
   - Set up free cron service
   - Call API endpoint every 5-15 minutes
   - No Vercel plan upgrade needed

## Current Setup (Daily)

The cron job will run **once per day at midnight UTC**.

**Note:** This means auctions may not end exactly at their `end_time`, but within 24 hours of expiration.

For most use cases, this is acceptable. If you need more frequent checks, consider the alternatives above.

## Testing

You can manually trigger the cron job:
```bash
curl -X GET https://yourdomain.com/api/cron/auction-end \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

