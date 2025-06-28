# Vercel Deployment Troubleshooting

If your Vercel deployment is failing, follow these steps to identify and fix the issue.

## Common Issues and Solutions

### 1. Missing Environment Variables

The most common cause of deployment failures is missing environment variables. Make sure you have all of these set in your Vercel project settings:

#### Required Environment Variables:

```env
# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Cron Job Security
CRON_SECRET=your_random_secret_key
```

#### How to Set Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add each variable with the correct name and value
5. Make sure to select all environments (Production, Preview, Development)
6. Redeploy your project

### 2. Check Vercel Function Logs

To see detailed error logs:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Functions" tab
4. Look for any failed function executions
5. Click on failed functions to see detailed logs

### 3. Test Environment Variables

You can test if your environment variables are working by visiting:

- `https://your-domain.vercel.app/api/test-notification` (POST request)
- `https://your-domain.vercel.app/api/cron/check-due-tasks` (GET request with Authorization header)

### 4. Common Error Messages

#### "Missing environment variables"
- **Solution**: Add all required environment variables to Vercel

#### "Unauthorized" (for cron job)
- **Solution**: Make sure `CRON_SECRET` is set correctly

#### "No push subscriptions found"
- **Solution**: This is normal if no users have subscribed yet

#### "Invalid VAPID key"
- **Solution**: Regenerate VAPID keys using `npm run generate-vapid`

### 5. Vercel Cron Job Setup

Make sure your `vercel.json` file is in the root directory:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-due-tasks",
      "schedule": "0 * * * *"
    }
  ]
}
```

### 6. Upstash Redis Connection

If you're having Redis connection issues:

1. Verify your Upstash Redis credentials
2. Make sure your Redis database is active
3. Check if your Redis database has the correct region

### 7. VAPID Key Issues

If VAPID keys aren't working:

1. Regenerate keys: `npm run generate-vapid`
2. Update both public and private keys in Vercel
3. Make sure the public key starts with `NEXT_PUBLIC_`

### 8. Deployment Checklist

Before deploying to Vercel:

- [ ] All environment variables are set
- [ ] VAPID keys are generated and configured
- [ ] Upstash Redis is set up and working
- [ ] `vercel.json` is in the root directory
- [ ] Local build passes (`npm run build`)

### 9. Testing the Deployment

After deployment:

1. Visit your app and enable push notifications
2. Use the "Test Notification" button in settings
3. Check Vercel function logs for any errors
4. Monitor the cron job execution (runs every hour)

### 10. Getting Help

If you're still having issues:

1. Check the Vercel function logs for specific error messages
2. Verify all environment variables are set correctly
3. Test the API endpoints manually
4. Check the browser console for client-side errors

## Quick Fix Commands

```bash
# Generate new VAPID keys
npm run generate-vapid

# Generate new cron secret
openssl rand -base64 32

# Test local build
npm run build

# Check environment variables locally
echo $UPSTASH_REDIS_REST_URL
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
``` 