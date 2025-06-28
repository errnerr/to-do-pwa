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

interface Task {
  id: string;
  text: string;
  dueDate?: string;
  reminder?: string;
  completed: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Cron job handler - runs every hour
export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron job started: Checking for due tasks...');

    // Get all push subscriptions
    const subscriptions = await redis.hgetall(SUBSCRIPTION_KEY);
    if (!subscriptions || Object.keys(subscriptions).length === 0) {
      console.log('No push subscriptions found');
      return NextResponse.json({ message: 'No subscriptions to check' });
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    let notificationsSent = 0;
    let errors = 0;

    // Check each subscription for due tasks
    for (const [endpoint, subscriptionData] of Object.entries(subscriptions)) {
      try {
        const subscription: PushSubscription = JSON.parse(subscriptionData as string);
        
        // Get tasks for this user (stored in localStorage, so we'll need to handle this differently)
        // For now, we'll send a general notification
        const dueTasks = await checkForDueTasks(subscription, currentTime);
        
        if (dueTasks.length > 0) {
          const success = await sendPushNotification(subscription, dueTasks);
          if (success) {
            notificationsSent++;
          } else {
            errors++;
          }
        }
      } catch (error) {
        console.error('Error processing subscription for endpoint:', endpoint, error);
        errors++;
      }
    }

    console.log(`Cron job completed: ${notificationsSent} notifications sent, ${errors} errors`);

    return NextResponse.json({
      success: true,
      notificationsSent,
      errors,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check for due tasks (placeholder - would need user-specific task storage)
async function checkForDueTasks(subscription: PushSubscription, currentTime: string): Promise<Task[]> {
  // This is a simplified version. In a real implementation, you'd need to:
  // 1. Store tasks in a database (not localStorage)
  // 2. Associate tasks with user subscriptions
  // 3. Check for tasks due at the current time
  
  // For now, return a mock task to test the notification system
  return [{
    id: '1',
    text: 'Test task due now',
    dueDate: new Date().toISOString(),
    reminder: currentTime,
    completed: false
  }];
}

// Send push notification
async function sendPushNotification(subscription: PushSubscription, tasks: Task[]): Promise<boolean> {
  try {
    const taskText = tasks.length === 1 ? tasks[0].text : `${tasks.length} tasks`;
    
    const payload = JSON.stringify({
      title: 'TaskMaster Reminder',
      body: `You have ${tasks.length === 1 ? 'a task' : 'tasks'} due: ${taskText}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: '/',
        tasks: tasks
      }
    });

    await webpush.sendNotification(subscription, payload);
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    
    // If subscription is invalid, remove it
    if (error instanceof Error && error.message.includes('410')) {
      await redis.hdel(SUBSCRIPTION_KEY, subscription.endpoint);
      console.log('Removed invalid subscription:', subscription.endpoint);
    }
    
    return false;
  }
} 