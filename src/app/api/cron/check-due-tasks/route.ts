import { NextRequest, NextResponse } from 'next/server';
import { getDueTasksForUser, getAllActivePushSubscriptions } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Cron job: Checking for due tasks...');

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    console.log('Current time:', currentTime);

    // Get all active push subscriptions with user info
    const subscriptions = await getAllActivePushSubscriptions();
    console.log(`Found ${subscriptions.length} active subscriptions`);

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: 'No active subscriptions found' });
    }

    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
    if (!VAPID_PRIVATE_KEY) {
      console.error('VAPID_PRIVATE_KEY not configured');
      return NextResponse.json({ error: 'VAPID private key not configured' }, { status: 500 });
    }

    let notificationsSent = 0;
    let errors = 0;

    // Group subscriptions by user
    const userSubscriptions = new Map<string, typeof subscriptions>();
    for (const subscription of subscriptions) {
      if (!userSubscriptions.has(subscription.user_id)) {
        userSubscriptions.set(subscription.user_id, []);
      }
      userSubscriptions.get(subscription.user_id)!.push(subscription);
    }

    // Check due tasks for each user
    for (const [userId, userSubs] of userSubscriptions) {
      try {
        // Get due tasks for this user
        const dueTasks = await getDueTasksForUser(userId, currentTime);
        
        if (dueTasks.length > 0) {
          console.log(`User ${userId} has ${dueTasks.length} due tasks`);

          // Create notification message
          const taskList = dueTasks.map(task => `• ${task.text}`).join('\n');
          const message = `You have ${dueTasks.length} task(s) due now:\n${taskList}`;

          // Send notification to all user's subscriptions
          for (const subscription of userSubs) {
            try {
              const payload = JSON.stringify({
                title: 'TaskMaster - Due Tasks',
                body: message,
                icon: '/icons/192.png',
                badge: '/icons/192.png',
                data: {
                  url: '/',
                  timestamp: Date.now()
                }
              });

              const response = await fetch(subscription.endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'TTL': '86400',
                  'Urgency': 'high',
                  'Authorization': `vapid t=${generateVAPIDToken(subscription.endpoint, VAPID_PRIVATE_KEY)}`
                },
                body: payload
              });

              if (response.ok) {
                notificationsSent++;
                console.log(`Notification sent to ${subscription.endpoint}`);
              } else {
                console.error(`Failed to send notification to ${subscription.endpoint}:`, response.status);
                errors++;
              }
            } catch (error) {
              console.error('Error sending notification:', error);
              errors++;
            }
          }
        }
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errors++;
      }
    }

    console.log(`Cron job completed: ${notificationsSent} notifications sent, ${errors} errors`);

    return NextResponse.json({
      success: true,
      notificationsSent,
      errors,
      message: `Due task check completed. ${notificationsSent} notifications sent.`
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Simple VAPID token generation (in production, use a proper library)
function generateVAPIDToken(endpoint: string, privateKey: string): string {
  // This is a simplified implementation
  // In production, use a proper VAPID library like 'web-push'
  const timestamp = Math.floor(Date.now() / 1000);
  const token = btoa(`${endpoint}:${timestamp}:${privateKey}`);
  return token;
} 