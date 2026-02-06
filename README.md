# SDA Management System

A comprehensive management system for Specialist Disability Accommodation (SDA) properties, built with Next.js, Convex, and TypeScript.

## Features

- **Property Management**: Track SDA properties, dwellings, and occupancy
- **Participant Management**: Manage participant information, NDIS plans, and funding
- **Preventative Maintenance**: Schedule and track maintenance with SDA compliance templates
- **Alerts & Notifications**: Automated alerts for critical events with email/SMS notifications
- **Reports & Analytics**: Compliance tracking, cost analysis, and contractor performance reports
- **Document Management**: Store and track important documents with expiry dates
- **Payment Tracking**: Record and monitor participant payments

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Backend**: Convex (serverless backend with real-time data)
- **Styling**: Tailwind CSS
- **PDF Generation**: jsPDF with autotable
- **Email**: Resend API
- **SMS**: Twilio API

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- A Convex account (free at [convex.dev](https://convex.dev))
- (Optional) Resend account for email notifications
- (Optional) Twilio account for SMS notifications

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sda-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your configuration:
```env
# Convex (Required)
CONVEX_DEPLOYMENT=<your-convex-deployment>
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>

# Email Notifications (Optional)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=alerts@yourdomain.com

# SMS Notifications (Optional)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

4. Initialize Convex:
```bash
npx convex dev
```

This will:
- Create a new Convex project (if needed)
- Deploy your backend functions
- Set up the database schema
- Generate TypeScript types

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Initial Setup

1. Navigate to [http://localhost:3000/setup](http://localhost:3000/setup)
2. Create an admin user account
3. Log in and start using the system

## Notification System Setup

The system includes comprehensive email and SMS notification capabilities. To enable them:

### Email Notifications (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. (Optional) Verify your domain for custom sender email
4. Add to `.env.local`:
   ```env
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=alerts@yourdomain.com  # Optional, defaults to alerts@yourdomain.com
   ```

### SMS Notifications (Twilio)

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your Account SID, Auth Token, and a phone number
3. Add to `.env.local`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Automated Alerts

The system automatically generates and sends notifications for:

- NDIS plan expiries (30 days before)
- Document expiries (30 days before)
- Overdue maintenance
- Urgent maintenance requests
- Vacant dwellings
- Preventative maintenance due dates

Cron jobs run daily at:
- **12:00 AM UTC**: Generate alerts
- **12:05 AM UTC**: Send email/SMS notifications for new alerts
- **9:00 AM UTC**: Send daily digest emails (if enabled)

Users can manage their notification preferences at `/settings`.

## SDA Compliance Templates

The system includes 14 pre-configured preventative maintenance templates based on Better Living Solutions SDA compliance requirements:

- Air Conditioning Service (4 months)
- Air Conditioner Filters (monthly)
- Garage Door Service (12 months)
- Gutter Cleaning (6 months)
- Pest Control (3 months)
- Emergency & Exit Lighting Test (6 months)
- Smoke Alarm Test (12 months)
- RCD Safety Switch Test (12 months)
- Electric Hot Water Service (5 years)
- Gas Heater/Cooktop Service (2 years)
- Pool & Spa Compliance Inspection (12 months)
- Building & Pool Safety Certificates (varies)
- Strata Levies (quarterly)
- Body Corporate / OC Levies (quarterly)

Apply templates from the Preventative Schedule page → "Apply SDA Templates".

## Development

### Project Structure

```
sda-management/
├── src/app/              # Next.js app router pages
│   ├── alerts/           # Alert management
│   ├── dashboard/        # Main dashboard
│   ├── documents/        # Document management
│   ├── login/            # Authentication
│   ├── maintenance/      # Maintenance requests
│   ├── participants/     # Participant management
│   ├── payments/         # Payment tracking
│   ├── preventative-schedule/  # Preventative maintenance
│   ├── properties/       # Property management
│   ├── reports/          # Reports & analytics
│   ├── settings/         # User notification settings
│   └── setup/            # Initial setup wizard
├── convex/               # Convex backend
│   ├── alerts.ts         # Alert generation & management
│   ├── crons.ts          # Scheduled jobs
│   ├── notifications.ts  # Email/SMS notification system
│   ├── reports.ts        # Report generation
│   ├── schema.ts         # Database schema
│   └── ...               # Other backend functions
└── public/               # Static assets
```

### Running Tests

```bash
npm run lint        # Run ESLint
npm run build       # Test production build
```

### Database Schema

The Convex database includes tables for:
- `users` - System users with roles and preferences
- `properties` - SDA properties
- `dwellings` - Individual dwellings within properties
- `participants` - NDIS participants
- `participantPlans` - NDIS plan details and funding
- `preventativeSchedule` - Scheduled maintenance tasks
- `maintenanceRequests` - Maintenance work orders
- `documents` - Document storage with metadata
- `alerts` - System-generated alerts
- `payments` - Payment records

See `convex/schema.ts` for the complete schema definition.

## Deployment

### Deploy to Production

1. Build the application:
```bash
npm run build
```

2. Deploy Convex backend:
```bash
npx convex deploy
```

3. Deploy Next.js frontend:

**Option A: Vercel (Recommended)**
- Connect your repository to Vercel
- Add environment variables in Vercel dashboard
- Deploy automatically on git push

**Option B: Other Platforms**
- Build: `npm run build`
- Start: `npm start`
- Ensure all environment variables are set

### Environment Variables for Production

Ensure these are set in your production environment:

```env
# Required
CONVEX_DEPLOYMENT=prod:<your-deployment-id>
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud

# Optional but recommended
RESEND_API_KEY=<your-key>
RESEND_FROM_EMAIL=<your-email>
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_PHONE_NUMBER=<your-number>
```

### Production Checklist

- [ ] All environment variables configured
- [ ] Convex backend deployed (`npx convex deploy`)
- [ ] Frontend deployed and accessible
- [ ] Admin user created via `/setup`
- [ ] Email notifications tested (if enabled)
- [ ] SMS notifications tested (if enabled)
- [ ] Cron jobs running (check Convex dashboard)
- [ ] Database backup strategy in place
- [ ] SSL certificate configured
- [ ] Domain configured (if applicable)

## Security Considerations

1. **Authentication**: Server-side session management (Production Ready)
   - Bcrypt password hashing (12 salt rounds)
   - 24-hour access tokens with 30-day refresh tokens
   - Secure session storage in Convex database

2. **Audit Logging**: Immutable audit trail with SHA-256 hash chain
   - All CRUD operations logged with user, timestamp, and changes
   - Tamper-proof hash chain (NDIS 7-year retention compliance)
   - Daily integrity verification (cron job at 3 AM UTC)
   - Deletion prevention enforced

3. **Access Control**: Role-Based Access Control (RBAC)
   - Permission checks on all sensitive mutations
   - Route protection via RequireAuth component
   - Admin-only endpoints properly secured

4. **Data Validation**: All inputs validated on backend via Convex validators and Zod schemas

5. **API Keys**: Never commit `.env.local` to version control

6. **HTTPS**: Always use HTTPS in production

**Security Grade: A+ (Production Ready)** - Verified via automated Playwright security testing

## Support & Documentation

- **Convex Docs**: [docs.convex.dev](https://docs.convex.dev)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Tailwind Docs**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Twilio Docs**: [twilio.com/docs](https://www.twilio.com/docs)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - All rights reserved

## Future Roadmap

### Mobile App (PWA) - Priority: High
Convert the application to a Progressive Web App for on-site maintenance use:
- **Features**: Install on home screen, offline support, camera access for photos
- **Use Case**: Field workers can tick off maintenance tasks and add remarks on-site
- **Implementation**: Add manifest.json, service worker, optimize for touch interactions
- **Effort**: 1-2 days

### Property Inspection Checklists - Priority: High
Digital inspection checklists for routine property checks:
- **Features**: Pre-defined BLS inspection templates, room-by-room checklists, photo upload for issues, condition/remarks fields
- **Categories**: Heating/Cooling, Electrical, Plumbing, Windows, Doors, Exterior, Garage, Bedrooms, Bathrooms, Kitchen, Living Areas
- **Use Case**: Contractors conduct on-site inspections, tick items Pass/Fail, upload photos for issues
- **Mobile-optimized**: Large touch targets, swipe gestures, camera quick-access
- **Effort**: 1-2 weeks

### Custom Domain - Priority: Medium
- Connect `betterlivingsolutions.com.au` to the application
- Configure SSL certificate
- Set up email sending from custom domain

### Security Enhancements - ✅ COMPLETE (v1.3.1)
- ✅ Server-side session management with tokens
- ✅ Audit logging with SHA-256 hash chain (immutable)
- ✅ Role-based access control (RBAC) with permission checks
- ✅ Bcrypt password hashing (12 salt rounds)
- ✅ Route protection with RequireAuth component
- ✅ Automated security testing (Playwright)
- 🔜 Two-Factor Authentication (2FA) - Next priority
- 🔜 Field-level encryption for sensitive data

### AI Integration - Priority: Medium
- **NDIS Plan Auto-Fill**: Upload participant's NDIS plan PDF, AI extracts and auto-populates participant details (name, NDIS number, plan dates, funding amounts)
- **Smart Document Classification**: Upload documents and AI automatically categorizes, tags, and extracts key data (expiry dates, parties, amounts)
- **Implementation**: Claude API with vision capabilities
- **Cost**: ~$0.01-0.05 per document processed

### Additional Future Considerations
- Capacitor wrapper for App Store/Play Store distribution
- Push notifications for urgent maintenance alerts
- Offline-first data sync for remote locations
- Integration with NDIS portal APIs

## Version History

### v1.3.1 - Current (2026-02-06) 🔒 Security Release
- **Production-Ready Security**: A+ grade verified via automated testing
- Server-side session management (bcrypt + tokens)
- Immutable audit logging with SHA-256 hash chain
- Role-Based Access Control (RBAC) with permission checks
- Route protection fixed (admin pages secured)
- Performance optimization (properties.by_isActive index)
- Automated Playwright security test suite
- NDIS 7-year retention compliance enforcement

### v1.3.0 (2026-02-05)
- Follow-ups & Tasks feature (communications tracking)
- Drag & drop attachment uploads
- SIL Provider management
- Authentication dual system (backward compatibility)
- WCAG 2.1 AA accessibility improvements

### v1.1.0
- Owner bank details for payment distributions (BSB, Account Number, Account Name)
- Maintenance request photo uploads
- Maintenance request detail/edit page
- Responsive header across all pages
- Improved mobile navigation

### v1.0.0 - Initial Release
- Property and participant management
- Preventative maintenance scheduling
- Automated alerts and notifications
- Reports and analytics
- Email/SMS notification system
- PDF/CSV export functionality
- SDA compliance templates
