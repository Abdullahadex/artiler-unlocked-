# Render Deployment Guide

## Quick Start

1. **Connect your GitHub repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub account
   - Select the `atelier-unlocked` repository

2. **Configure the Web Service**
   - **Name**: `atelier-unlocked` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or higher for production)

3. **Set Environment Variables**

   Go to your service → Environment tab and add:

   ### Required:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=https://your-app.onrender.com
   ```

   ### Optional (for full functionality):
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=your_api_key
   SMTP_FROM=noreply@yourdomain.com
   
   CRON_SECRET=your_random_secret_here
   NEXT_PUBLIC_SENTRY_DSN=https://...
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Your app will be available at `https://your-app.onrender.com`

## Using render.yaml (Alternative Method)

If you prefer using the `render.yaml` file:

1. Push the `render.yaml` file to your GitHub repository
2. In Render Dashboard, click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect and use the `render.yaml` configuration
5. Set your environment variables in the Render dashboard

## Important Notes

### Database
- This app uses **Supabase** (external database)
- No need to set up a database in Render
- Make sure your Supabase migrations are run (see `DEPLOYMENT_CHECKLIST.md`)

### Cron Jobs
- Render doesn't support cron jobs on the free tier
- For auction end automation, you can:
  - Use an external cron service (cron-job.org, EasyCron)
  - Call: `https://your-app.onrender.com/api/cron/auction-end`
  - Include header: `Authorization: Bearer ${CRON_SECRET}`
  - Or upgrade to a paid Render plan with cron support

### Build Time
- First build may take 5-10 minutes
- Subsequent builds are faster (2-5 minutes)

### Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- First request after spin-down may be slow (cold start)
- Consider upgrading for production use

### Custom Domain
1. Go to your service → Settings → Custom Domains
2. Add your domain
3. Update DNS records as instructed
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain

## Troubleshooting

### Build Fails
- Check build logs in Render dashboard
- Ensure all environment variables are set
- Verify Node.js version compatibility (Render uses Node 18+ by default)

### App Not Loading
- Check service logs
- Verify `NEXT_PUBLIC_APP_URL` matches your Render URL
- Ensure Supabase environment variables are correct

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check Supabase dashboard for connection status
- Ensure migrations have been run

## Post-Deployment Checklist

- [ ] Run all database migrations in Supabase
- [ ] Set all required environment variables
- [ ] Test authentication (sign up/sign in)
- [ ] Test auction creation
- [ ] Test bidding functionality
- [ ] Set up custom domain (if applicable)
- [ ] Configure cron job for auction endings (if needed)
- [ ] Set up monitoring/error tracking (Sentry)

## Support

For Render-specific issues, check:
- [Render Documentation](https://render.com/docs)
- [Render Status Page](https://status.render.com)

