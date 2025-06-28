import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByDeviceId } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Try to get existing user by device ID
    let user = await getUserByDeviceId(deviceId);
    
    // Create user if doesn't exist
    if (!user) {
      user = await createUser(deviceId);
    }
    
    // Return user data
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        deviceId: user.device_id,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Failed to authenticate device' }, { status: 500 });
  }
} 