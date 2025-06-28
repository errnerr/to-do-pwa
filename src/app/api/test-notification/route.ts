import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import webpush from 'web-push';

// Check if required environment variables are set
const requiredEnvVars = {
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.warn('Missing environment variables:', missingEnvVars);
}

const redis = missingEnvVars.includes('UPSTASH_REDIS_REST_URL') || missingEnvVars.includes('UPSTASH_REDIS_REST_TOKEN')
  ? null
  : new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

const SUBSCRIPTION_KEY = 'push_subscriptions';

// Configure web-push with VAPID keys (only if available)
if (!missingEnvVars.includes('NEXT_PUBLIC_VAPID_PUBLIC_KEY') && !missingEnvVars.includes('VAPID_PRIVATE_KEY')) {
  webpush.setVapidDetails(
    'mailto:your-email@example.com', // Replace with your email
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

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
    console.log('Test notification endpoint called');
    
    // Check if required environment variables are missing
    if (missingEnvVars.length > 0) {
      console.error('Missing environment variables:', missingEnvVars);
      return NextResponse.json({
        error: 'Missing environment variables',
        missing: missingEnvVars,
        message: 'Please configure all required environment variables in Vercel'
      }, { status: 500 });
    }

    const body = await request.json();
    const { message = 'Test notification from TaskMaster!' } = body;
    console.log('Test message:', message);

    // Get all push subscriptions
    console.log('Fetching push subscriptions from Redis...');
    const subscriptions = await redis!.hgetall(SUBSCRIPTION_KEY);
    console.log('Subscriptions found:', subscriptions);
    
    if (!subscriptions || Object.keys(subscriptions).length === 0) {
      console.log('No push subscriptions found in Redis');
      return NextResponse.json({ error: 'No push subscriptions found' }, { status: 404 });
    }

    console.log('Number of subscriptions:', Object.keys(subscriptions).length);

    let notificationsSent = 0;
    let errors = 0;

    // Send notification to all subscriptions
    for (const [endpoint, subscriptionData] of Object.entries(subscriptions)) {
      try {
        console.log('Processing subscription for endpoint:', endpoint.substring(0, 50) + '...');
        console.log('Subscription data type:', typeof subscriptionData);
        console.log('Subscription data:', subscriptionData);
        
        // Handle both string and object formats from Redis
        let subscription: PushSubscription;
        if (typeof subscriptionData === 'string') {
          subscription = JSON.parse(subscriptionData);
        } else {
          subscription = subscriptionData as PushSubscription;
        }
        
        console.log('Parsed subscription:', subscription);
        
        const payload = JSON.stringify({
          title: 'TaskMaster Test',
          body: message,
          icon: '/icons/192.png',
          badge: '/icons/72.png',
          data: {
            url: '/',
            timestamp: new Date().toISOString()
          }
        });

        console.log('Sending push notification...');
        await webpush.sendNotification(subscription, payload);
        console.log('Push notification sent successfully');
        notificationsSent++;
      } catch (error) {
        console.error('Error sending test notification:', error);
        
        // If subscription is invalid, remove it
        if (error instanceof Error && error.message.includes('410')) {
          await redis!.hdel(SUBSCRIPTION_KEY, endpoint);
          console.log('Removed invalid subscription:', endpoint);
        }
        
        errors++;
      }
    }

    console.log(`Test notification completed: ${notificationsSent} sent, ${errors} errors`);

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