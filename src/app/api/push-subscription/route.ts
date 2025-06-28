import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// You will need to set these in your Vercel/Next.js environment
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SUBSCRIPTION_KEY = 'push_subscriptions';

// Save a new subscription (POST)
export async function POST(req: NextRequest) {
  try {
    console.log('Push subscription save endpoint called');
    
    const body = await req.json();
    console.log('Subscription data received:', {
      endpoint: body.endpoint?.substring(0, 50) + '...',
      hasKeys: !!body.keys
    });
    
    if (!body || !body.endpoint) {
      console.error('Invalid subscription data');
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    
    // Store by endpoint for idempotency
    console.log('Saving subscription to Redis...');
    await redis.hset(SUBSCRIPTION_KEY, { [body.endpoint]: JSON.stringify(body) });
    console.log('Subscription saved successfully');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

// List all subscriptions (GET)
export async function GET() {
  try {
    const all = await redis.hgetall(SUBSCRIPTION_KEY);
    return NextResponse.json({ subscriptions: all });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
} 