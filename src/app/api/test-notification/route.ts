import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import webpush from 'web-push';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SUBSCRIPTION_KEY = 'push_subscriptions';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Test endpoint to send a push notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message = 'Test notification from TaskMaster!' } = body;

    // Get all push subscriptions
    const subscriptions = await redis.hgetall(SUBSCRIPTION_KEY);
    if (!subscriptions || Object.keys(subscriptions).length === 0) {
      return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 });
    }

    let notificationsSent = 0;
    let errors = 0;

    // Send notification to all subscriptions
    for (const [endpoint, subscriptionData] of Object.entries(subscriptions)) {
      try {
        const subscription: PushSubscription = JSON.parse(subscriptionData as string);
        
        const payload = JSON.stringify({
          title: 'TaskMaster Test',
          body: message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          data: {
            url: '/',
            timestamp: new Date().toISOString()
          }
        });

        await webpush.sendNotification(subscription, payload);
        notificationsSent++;
      } catch (error) {
        console.error('Error sending test notification:', error);
        
        // If subscription is invalid, remove it
        if (error instanceof Error && error.message.includes('410')) {
          await redis.hdel(SUBSCRIPTION_KEY, endpoint);
          console.log('Removed invalid subscription:', endpoint);
        }
        
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      errors,
      message: `Test notification sent to ${notificationsSent} devices`
    });

  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 