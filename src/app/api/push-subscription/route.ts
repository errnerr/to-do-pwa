import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, getPushSubscriptionsByUserId, deletePushSubscription } from '@/lib/database';
import { getUserByDeviceId } from '@/lib/database';

// Helper function to get user ID from device ID
async function getUserIdFromDeviceId(deviceId: string): Promise<string | null> {
  try {
    const user = await getUserByDeviceId(deviceId);
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user ID from device ID:', error);
    return null;
  }
}

// Save a new subscription (POST)
export async function POST(request: NextRequest) {
  try {
    const deviceId = request.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const userId = await getUserIdFromDeviceId(deviceId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    const savedSubscription = await savePushSubscription(userId, subscription);
    return NextResponse.json({ success: true, subscription: savedSubscription });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

// Get subscriptions (GET)
export async function GET(request: NextRequest) {
  try {
    const deviceId = request.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const userId = await getUserIdFromDeviceId(deviceId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscriptions = await getPushSubscriptionsByUserId(userId);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

// Delete subscription (DELETE)
export async function DELETE(request: NextRequest) {
  try {
    const deviceId = request.headers.get('x-device-id');
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const userId = await getUserIdFromDeviceId(deviceId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    await deletePushSubscription(userId, endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
} 