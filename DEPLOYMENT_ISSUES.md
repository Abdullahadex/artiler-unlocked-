# Deployment Issues Found & Fixes

## 🔴 Critical Issues

### 1. **Missing Environment Variable Validation**
**Location:** `src/integrations/supabase/client.ts`
**Issue:** Uses `!` assertion which will cause runtime error if env vars are missing
**Fix:** Add validation with helpful error messages

### 2. **Email API Route - Missing SMTP Validation**
**Location:** `src/app/api/email/send/route.ts`
**Issue:** No validation for SMTP env vars before creating transporter
**Fix:** Add validation and graceful fallback

### 3. **Cron Job - Email Sending Issue**
**Location:** `src/app/api/cron/auction-end/route.ts`
**Issue:** Line 46 - tries to send email to `winningBid.bidder.id` instead of email address
**Fix:** Need to get email from user profile

### 4. **Admin Role Not in Enum**
**Location:** `supabase/migrations/20251215210000_analytics_table.sql`
**Issue:** Checks for `profiles.role = 'admin'` but enum only has 'collector' and 'designer'
**Fix:** Add 'admin' to user_role enum

### 5. **Storage Bucket Creation**
**Location:** `supabase/migrations/20251215191831_aefb18f4-317b-480c-8129-b4bb894e656d.sql`
**Issue:** Line 154 - INSERT will fail if bucket already exists
**Fix:** Use INSERT ... ON CONFLICT DO NOTHING

## 🟡 Important Issues

### 6. **Missing Error Boundaries in API Routes**
**Issue:** Some API routes don't have comprehensive error handling
**Impact:** Could cause 500 errors without helpful messages

### 7. **Stripe Webhook Secret Validation**
**Location:** `src/app/api/webhooks/stripe/route.ts`
**Issue:** No check if webhook secret is configured
**Fix:** Add validation

### 8. **Analytics Table - Missing Email Field**
**Issue:** Email sending in cron job uses user ID instead of email
**Fix:** Need to fetch email from auth.users or add to profiles

## 🟢 Minor Issues

### 9. **Type Safety**
- Some `any` types that could be more specific
- Missing null checks in some places

### 10. **Performance**
- Rate limiting is in-memory (won't work across multiple instances)
- Consider Redis for production

---

## Recommended Fixes Priority

1. **HIGH:** Fix environment variable validation
2. **HIGH:** Fix admin role enum
3. **HIGH:** Fix email sending in cron job
4. **MEDIUM:** Fix storage bucket creation
5. **MEDIUM:** Add SMTP validation
6. **LOW:** Improve error handling
7. **LOW:** Add Redis for rate limiting (production)

