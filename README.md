# TaskMaster PWA

A modern, offline-capable to-do app built with Next.js, featuring push notifications and a native mobile experience.

## Features

- ✅ Offline-first PWA with service worker
- 📱 Native mobile experience with safe area handling
- 🔔 Push notifications for task reminders
- 📅 Due dates and time-based reminders
- 🔍 Search and filter tasks
- 💾 Persistent storage with localStorage
- 🎨 Modern UI with shadcn/ui components
- ⚡ Smooth animations with Framer Motion

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Upstash Redis (for push notification subscriptions)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# VAPID Keys (for push notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Cron Job Security (for scheduled notifications)
CRON_SECRET=your_random_secret_key_here
```

### 3. Generate VAPID Keys

For development, you can generate VAPID keys using the web-push library:

```bash
npm run generate-vapid
```

This will output a public and private key pair. Use the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key as `VAPID_PRIVATE_KEY`.

### 4. Generate Cron Secret

Generate a random secret for the cron job:

```bash
openssl rand -base64 32
```

Use this as your `CRON_SECRET` value.

### 5. Upstash Redis Setup

1. Create an account at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the REST URL and REST Token to your environment variables

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Push Notifications

The app supports push notifications for task reminders. To enable:

1. Ensure your environment variables are set correctly
2. Open the app in a supported browser (Chrome, Firefox, Safari)
3. Go to Settings and toggle "Push notifications"
4. Grant notification permission when prompted

### How it works:

1. User enables push notifications in settings
2. App requests notification permission
3. Service worker registers for push notifications
4. Subscription is saved to Upstash Redis
5. Vercel Cron Job runs every hour to check for due tasks
6. Push notifications are sent to subscribed users

### Testing Notifications

- Use the "Test Notification" button in Settings to manually trigger a notification
- The cron job runs every hour to check for due tasks automatically

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables in Vercel

Make sure to add all environment variables in your Vercel project settings:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET`

### Cron Job Setup

The cron job is automatically configured via `vercel.json` and runs every hour. Make sure to:

1. Set the `CRON_SECRET` environment variable in Vercel
2. Deploy to Vercel (cron jobs only work in production)
3. Monitor the cron job logs in Vercel dashboard

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Database**: Upstash Redis
- **Deployment**: Vercel
- **PWA**: Service Worker + Web App Manifest
- **Push Notifications**: Web Push API + Vercel Cron Jobs

## License

MIT