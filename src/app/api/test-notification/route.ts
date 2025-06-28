import { NextRequest, NextResponse } from 'next/server';
import { getPushSubscriptionsByUserId } from '@/lib/database';
import { getUserByDeviceId } from '@/lib/database';
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const deviceId = request.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    // Get user by device ID
    const user = await getUserByDeviceId(deviceId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's push subscriptions
    const subscriptions = await getPushSubscriptionsByUserId(user.id);
    
    if (subscriptions.length === 0) {
      return NextResponse.json({ 
        error: 'No push subscriptions found for this device',
        message: 'Please enable push notifications in settings first'
      }, { status: 404 });
    }

    const body = await request.json();
    const { message = 'Test notification from TaskMaster!' } = body;

    let successCount = 0;
    let errorCount = 0;

    // Send notification to all user's subscriptions
    for (const subscription of subscriptions) {
      try {
        const payload = JSON.stringify({
          title: 'TaskMaster',
          body: message,
          icon: '/icons/192.png',
          badge: '/icons/192.png',
          data: {
            url: '/',
            timestamp: Date.now()
          }
        });

        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );
        successCount++;
      } catch (error) {
        console.error('Error sending notification:', error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      return NextResponse.json({ 
        message: `Test notification sent to ${successCount} device(s)`,
        successCount,
        errorCount
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send test notification to any devices',
        errorCount
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test notification endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 