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

1. **Authentication**: Uses localStorage for client-side authentication (demo purposes)
   - For production, implement proper JWT tokens or NextAuth.js

2. **Data Validation**: All inputs are validated on the backend via Convex validators

3. **API Keys**: Never commit `.env.local` to version control

4. **User Roles**: Implement proper role-based access control in production

5. **HTTPS**: Always use HTTPS in production

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

## Version History

### v1.0.0 - Initial Release
- Property and participant management
- Preventative maintenance scheduling
- Automated alerts and notifications
- Reports and analytics
- Email/SMS notification system
- PDF/CSV export functionality
- SDA compliance templates
