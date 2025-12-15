# Environment Variables Setup Guide

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your values** (see instructions below)

3. **Never commit `.env.local` to git!**

---

## Required Environment Variables

### 1. Supabase Configuration

**Where to get:**
- Go to https://supabase.com
- Create a new project (or use existing)
- Go to: Settings → API
- Copy the values

**Variables needed:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 2. Stripe Configuration

**Where to get:**
- Go to https://stripe.com
- Sign up or log in
- Go to: Developers → API keys
- Use **Test mode** keys for development
- Use **Live mode** keys for production

**Variables needed:**
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

**Webhook Setup:**
1. Go to: Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the webhook signing secret:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

### 3. Email Configuration (SMTP)

#### Option A: Gmail (Easiest for testing)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to: Google Account → Security → App passwords
3. Generate a new app password
4. Use these settings:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
SMTP_FROM=noreply@atelier.com
```

#### Option B: SendGrid (Recommended for production)

1. Sign up at https://sendgrid.com
2. Create API key
3. Verify sender email
4. Use these settings:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM=verified_email@yourdomain.com
```

#### Option C: Resend (Modern alternative)

1. Sign up at https://resend.com
2. Get API key
3. Use these settings:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your_resend_api_key
SMTP_FROM=noreply@yourdomain.com
```

---

### 4. Sentry Error Monitoring

**Where to get:**
1. Sign up at https://sentry.io
2. Create a new project (choose Next.js)
3. Copy the DSN from project settings

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

**Note:** Sentry is optional but highly recommended for production.

---

### 5. Application URL

**For Development:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**For Production:**
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

### 6. Cron Job Secret

Generate a random secret for cron job authentication:

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Or use an online generator:**
- https://randomkeygen.com/

```env
CRON_SECRET=your_generated_secret_here
```

---

### 7. Analytics (Optional)

Enable/disable analytics tracking:

```env
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

---

## Setup Checklist

### Minimum Required (App will run but features won't work):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### For Full Functionality:
- [ ] Supabase (required)
- [ ] Stripe keys (for payments)
- [ ] Stripe webhook secret (for payment confirmations)
- [ ] SMTP credentials (for emails)
- [ ] Sentry DSN (for error tracking)
- [ ] App URL (for redirects)
- [ ] Cron secret (for scheduled jobs)

---

## Testing Your Configuration

### 1. Test Supabase Connection
```bash
npm run dev
# Visit http://localhost:3000
# Try to sign up - should work if Supabase is configured
```

### 2. Test Stripe (Optional)
- Try creating an auction
- Place a test bid
- Check Stripe dashboard for test payments

### 3. Test Email (Optional)
- Sign up a new user
- Check if welcome email is sent
- Check spam folder if not received

### 4. Test Sentry (Optional)
- Trigger an error (e.g., invalid bid)
- Check Sentry dashboard for error report

---

## Security Notes

1. **Never commit `.env.local` to git**
   - It's already in `.gitignore`
   - Double-check before committing

2. **Use different keys for development and production**
   - Development: Test keys
   - Production: Live keys

3. **Rotate secrets regularly**
   - Especially if exposed or compromised

4. **Use environment-specific files**
   - `.env.local` - Local development
   - `.env.production` - Production (on hosting platform)

---

## Troubleshooting

### "Missing environment variable" error
- Check that all required variables are set
- Restart dev server after adding variables
- Check for typos in variable names

### Email not sending
- Verify SMTP credentials
- Check firewall/port access
- Try different SMTP provider
- Check email service logs

### Stripe payments failing
- Verify API keys are correct
- Check if using test/live keys correctly
- Verify webhook endpoint is accessible
- Check Stripe dashboard for errors

### Supabase connection issues
- Verify URL and key are correct
- Check Supabase project is active
- Verify RLS policies are set up
- Check network/firewall access

---

## Need Help?

- Check the main `PRODUCTION_SETUP.md` guide
- Review service-specific documentation:
  - Supabase: https://supabase.com/docs
  - Stripe: https://stripe.com/docs
  - Sentry: https://docs.sentry.io

---

## Quick Reference

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Database connection |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Database auth |
| `STRIPE_SECRET_KEY` | ⚠️ For payments | Payment processing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ For payments | Payment UI |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ For payments | Payment webhooks |
| `SMTP_HOST` | ⚠️ For emails | Email server |
| `SMTP_USER` | ⚠️ For emails | Email username |
| `SMTP_PASSWORD` | ⚠️ For emails | Email password |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ Optional | Error tracking |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Recommended | App URL |
| `CRON_SECRET` | ⚠️ For cron jobs | Scheduled tasks |

✅ = Required | ⚠️ = Required for specific features | ❌ = Optional
