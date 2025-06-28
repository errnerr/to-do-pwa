# TaskMaster PWA

A modern, privacy-focused Progressive Web App for task management with device-based authentication, push notifications, and offline support.

## Features

- 📱 **PWA Support** - Install as a native app
- 🔐 **Device-Based Authentication** - No registration required, unique device identification
- 🔔 **Push Notifications** - Get notified when tasks are due
- 📅 **Due Dates & Reminders** - Set deadlines and reminder times
- 🎨 **Modern UI** - Beautiful, responsive design with animations
- 💾 **Offline Support** - Works without internet connection
- 🔍 **Search & Filter** - Find tasks quickly
- 📊 **Task Statistics** - Track your productivity

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: NeonDB (PostgreSQL)
- **Authentication**: Device fingerprinting
- **Push Notifications**: Web Push API with VAPID
- **Deployment**: Vercel

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd to-do-pwa
npm install
```

### 2. Set up NeonDB

1. Create a [NeonDB account](https://neon.tech)
2. Create a new project
3. Copy your connection string from the dashboard

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Database Configuration (NeonDB)
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"

# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

# Security Keys
CRON_SECRET="your-secure-cron-secret"
```

### 4. Generate VAPID Keys

```bash
node scripts/generate-vapid-keys.js
```

Copy the generated keys to your `.env.local` file.

### 5. Build and Deploy

```bash
# Build the app (this will also initialize the database)
npm run build

# Start the production server
npm start
```

The build process will automatically:
- Connect to your NeonDB database
- Create all necessary tables and indexes
- Build the Next.js application

**Note:** The database schema is created automatically during the build process. No manual database initialization is required.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | NeonDB connection string | ✅ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | ✅ |
| `VAPID_PRIVATE_KEY` | VAPID private key for push notifications | ✅ |
| `CRON_SECRET` | Secret key for cron job authentication | ✅ |

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `device_id` (VARCHAR) - Unique device identifier
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### Tasks Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `text` (TEXT) - Task description
- `completed` (BOOLEAN) - Completion status
- `due_date` (TIMESTAMP) - Due date (optional)
- `reminder_time` (VARCHAR) - Reminder time (optional)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### Push Subscriptions Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `endpoint` (TEXT) - Push subscription endpoint
- `p256dh` (TEXT) - Push subscription key
- `auth` (TEXT) - Push subscription auth
- `created_at` (TIMESTAMP) - Creation timestamp

## API Endpoints

### Tasks
- `GET /api/tasks` - Get all tasks for current device
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks` - Update a task
- `DELETE /api/tasks?id={id}` - Delete a task

### Push Subscriptions
- `POST /api/push-subscription` - Save push subscription
- `GET /api/push-subscription` - Get device subscriptions
- `DELETE /api/push-subscription` - Delete push subscription

### Notifications
- `POST /api/test-notification` - Send test notification

### Cron Jobs
- `GET /api/cron/check-due-tasks` - Check for due tasks and send notifications

## Device-Based Authentication

The app uses device fingerprinting to create unique user identities without requiring personal information:

1. **Device Fingerprinting**: Combines browser characteristics (screen size, user agent, timezone, etc.)
2. **Unique ID Generation**: Creates a SHA-256 hash of the fingerprint
3. **Automatic User Creation**: Users are created automatically on first visit
4. **Session Persistence**: Device ID is stored locally and persists across sessions

## Push Notifications

Push notifications are sent when:
- Tasks are due (via cron job)
- User requests a test notification

### Setup Requirements
- HTTPS connection (required for service workers)
- VAPID keys configured
- User permission granted

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set all environment variables in your Vercel project settings.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   └── AppShell.tsx   # App shell component
└── lib/               # Utility libraries
    ├── auth.ts        # Authentication utilities
    ├── database.ts    # Database operations
    └── push-notifications.ts # Push notification utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.