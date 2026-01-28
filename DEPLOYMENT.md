# SDA Management System - Production Deployment Guide

## Prerequisites

- GitHub account (for code hosting)
- Vercel account (or similar platform)
- Convex account (already set up)
- Resend account with verified domain
- Custom domain (optional but recommended)

## Step 1: Prepare for Deployment

### 1.1 Environment Variables

Create a `.env.production` file with production values:

```env
# Convex Production Deployment
CONVEX_DEPLOYMENT=prod:your-production-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-production-deployment.convex.cloud

# Email Notifications (Resend)
RESEND_API_KEY=your_production_resend_api_key
RESEND_FROM_EMAIL=alerts@yourdomain.com

# SMS Notifications (Twilio) - Optional
TWILIO_ACCOUNT_SID=your_production_account_sid
TWILIO_AUTH_TOKEN=your_production_auth_token
TWILIO_PHONE_NUMBER=your_production_phone_number
```

**Important:** Never commit `.env.production` to version control!

### 1.2 Update `.gitignore`

Ensure these files are ignored:

```
.env.local
.env.production
.env*.local
```

## Step 2: Set Up Production Convex Deployment

### 2.1 Create Production Deployment

```bash
# Login to Convex (if not already logged in)
npx convex login

# Create a new production deployment
npx convex deploy --prod

# This will create a new production deployment and give you:
# - Production deployment name (e.g., prod:awesome-animal-123)
# - Production URL (e.g., https://awesome-animal-123.convex.cloud)
```

### 2.2 Set Production Environment Variables

```bash
# Set Resend API credentials
npx convex env set RESEND_API_KEY your_production_api_key --prod
npx convex env set RESEND_FROM_EMAIL alerts@yourdomain.com --prod

# Set Twilio credentials (if using SMS)
npx convex env set TWILIO_ACCOUNT_SID your_account_sid --prod
npx convex env set TWILIO_AUTH_TOKEN your_auth_token --prod
npx convex env set TWILIO_PHONE_NUMBER +1234567890 --prod
```

### 2.3 Deploy Convex Functions

```bash
# Deploy all Convex functions to production
npx convex deploy --prod
```

## Step 3: Deploy to Vercel

### 3.1 Push to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit - SDA Management System"

# Create GitHub repository and push
# Go to https://github.com/new and create a new repository
# Then run:
git remote add origin https://github.com/yourusername/sda-management.git
git branch -M main
git push -u origin main
```

### 3.2 Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

5. **Add Environment Variables:**
   - `NEXT_PUBLIC_CONVEX_URL`: Your production Convex URL
   - `CONVEX_DEPLOYMENT`: Your production deployment name
   - `RESEND_API_KEY`: Your Resend API key
   - `RESEND_FROM_EMAIL`: Your verified email address
   - `TWILIO_ACCOUNT_SID`: (Optional) Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: (Optional) Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: (Optional) Your Twilio Phone Number

6. Click "Deploy"

### 3.3 Verify Deployment

After deployment completes:
1. Visit your Vercel URL (e.g., `https://sda-management.vercel.app`)
2. Test login functionality
3. Verify all pages load correctly

## Step 4: Custom Domain Setup (Optional)

### 4.1 Add Domain to Vercel

1. Go to your project in Vercel
2. Navigate to "Settings" → "Domains"
3. Add your custom domain (e.g., `app.yourdomain.com`)
4. Follow Vercel's instructions to configure DNS records

### 4.2 Configure DNS Records

Add these records to your domain provider:

**For Vercel:**
```
Type: CNAME
Name: app (or your subdomain)
Value: cname.vercel-dns.com
```

**For Resend Email (if using custom domain):**
```
Type: TXT
Name: _resend (or as specified by Resend)
Value: [provided by Resend]

Type: MX
Name: @
Value: [provided by Resend]
Priority: 10

Type: DKIM (TXT)
Name: resend._domainkey
Value: [provided by Resend]
```

## Step 5: Verify Email Domain in Resend

### 5.1 Add Domain to Resend

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Copy the DNS records provided by Resend

### 5.2 Add DNS Records

Add these records to your domain provider:
- **SPF Record** (TXT): `v=spf1 include:amazonses.com ~all`
- **DKIM Record** (TXT): `[provided by Resend]`
- **DMARC Record** (TXT): `v=DMARC1; p=none;`

### 5.3 Verify Domain

1. Wait 5-10 minutes for DNS propagation
2. Click "Verify" in Resend dashboard
3. Once verified, you can send emails from `alerts@yourdomain.com`

## Step 6: Post-Deployment Configuration

### 6.1 Create Admin User

```bash
# Using Convex dashboard or CLI
npx convex run auth:createUser \
  --prod \
  email="admin@yourdomain.com" \
  password="SecurePassword123!" \
  firstName="Admin" \
  lastName="User" \
  role="admin" \
  phone="+1234567890"
```

### 6.2 Test Production Features

1. **Login:** Test user authentication
2. **Email Notifications:** Send test email from Settings page
3. **Alerts:** Verify alerts are being generated
4. **Reports:** Export PDF/CSV reports
5. **Cron Jobs:** Check Convex dashboard for cron job execution

### 6.3 Monitor Logs

- **Vercel Logs:** Go to your project → "Deployments" → Select deployment → "Logs"
- **Convex Logs:** Go to Convex dashboard → Select production deployment → "Logs"

## Step 7: Security Checklist

### 7.1 Before Going Live

- [ ] Change all default passwords
- [ ] Verify `.env.local` is in `.gitignore`
- [ ] Verify no sensitive data in git history
- [ ] Test all authentication flows
- [ ] Verify email domain is verified in Resend
- [ ] Test notification delivery
- [ ] Review Convex security rules
- [ ] Enable Vercel authentication (if needed)
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure backup strategy for Convex data

### 7.2 Production Best Practices

- [ ] Use strong passwords for all accounts
- [ ] Enable 2FA on Vercel and Convex accounts
- [ ] Use environment-specific API keys (dev vs prod)
- [ ] Monitor application performance
- [ ] Set up uptime monitoring
- [ ] Configure CORS if needed
- [ ] Review and limit API rate limits
- [ ] Set up automated backups
- [ ] Document deployment process
- [ ] Create runbook for common issues

## Step 8: Rollback Plan

### 8.1 Vercel Rollback

1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Select previous working deployment
4. Click "Promote to Production"

### 8.2 Convex Rollback

```bash
# List deployments
npx convex deployments list --prod

# Rollback to previous version
npx convex deploy --prod --rollback
```

## Troubleshooting

### Common Issues

**Issue: Email notifications not sending**
- Solution: Verify domain is verified in Resend
- Solution: Check environment variables are set correctly
- Solution: Review Convex action logs for errors

**Issue: Database connection errors**
- Solution: Verify `NEXT_PUBLIC_CONVEX_URL` is correct
- Solution: Check Convex deployment status
- Solution: Clear browser cache and try again

**Issue: Cron jobs not running**
- Solution: Verify cron jobs are enabled in Convex dashboard
- Solution: Check cron job syntax in `convex/crons.ts`
- Solution: Review Convex logs for cron execution

**Issue: Build failures on Vercel**
- Solution: Check TypeScript errors locally first
- Solution: Verify all dependencies are in `package.json`
- Solution: Review Vercel build logs

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates in Vercel/Convex dashboards
- Check email delivery rates in Resend

**Weekly:**
- Review system logs for anomalies
- Check database size and performance
- Verify cron jobs are executing correctly

**Monthly:**
- Review and rotate API keys if needed
- Update dependencies (`npm update`)
- Review user feedback and issues
- Backup critical data

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Convex Docs:** https://docs.convex.dev
- **Resend Docs:** https://resend.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Tailwind CSS:** https://tailwindcss.com/docs

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production:** Pushes to `main` branch
- **Preview:** Pull requests and other branches

### Deployment Workflow

```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Commit changes
git add .
git commit -m "Your commit message"

# 4. Push to GitHub
git push origin main

# 5. Vercel automatically deploys
# 6. Monitor deployment in Vercel dashboard
```

## Scaling Considerations

As your application grows:

1. **Database Optimization:**
   - Add indexes for frequently queried fields
   - Implement pagination for large lists
   - Consider data archiving strategy

2. **Performance Monitoring:**
   - Use Vercel Analytics
   - Monitor API response times
   - Track user interactions

3. **Infrastructure:**
   - Consider Convex Professional plan for higher limits
   - Implement caching strategies
   - Optimize image delivery with Next.js Image

4. **Security:**
   - Regular security audits
   - Keep dependencies updated
   - Monitor for vulnerabilities

---

## Quick Deployment Commands

```bash
# Development
npm run dev                  # Start development server
npx convex dev              # Start Convex development

# Production
npx convex deploy --prod    # Deploy Convex functions
git push origin main        # Deploy to Vercel (automatic)

# Environment
npx convex env set KEY value --prod  # Set production env var
npx convex env list --prod           # List production env vars
```

---

**Last Updated:** 2026-01-28
**Version:** 1.0.0
