// Simple device-based authentication (no email/name required)
export interface Session {
  userId: string;
  deviceId: string;
  expiresAt: number;
}

const SESSION_KEY = 'taskmaster_session';
const DEVICE_ID_KEY = 'taskmaster_device_id';

// Generate a unique device ID based on browser fingerprint
async function generateDeviceId(): Promise<string> {
  try {
    // Check if we already have a device ID
    const existingDeviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (existingDeviceId) {
      return existingDeviceId;
    }

    // Generate a unique device fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency,
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 'unknown',
      navigator.platform,
      navigator.cookieEnabled ? '1' : '0',
      navigator.doNotTrack || 'unknown',
      window.devicePixelRatio,
      navigator.maxTouchPoints || '0'
    ].join('|');

    // Create a hash of the fingerprint
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    // Store the device ID
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    return deviceId;
  } catch (error) {
    console.error('Error generating device ID:', error);
    // Fallback to a simple random ID
    const fallbackId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(DEVICE_ID_KEY, fallbackId);
    return fallbackId;
  }
}

// Create or get user session based on device ID
export async function authenticateDevice(): Promise<Session> {
  try {
    // Generate or get device ID
    const deviceId = await generateDeviceId();
    
    // Check if we already have a valid session
    const existingSession = getCurrentSession();
    if (existingSession && existingSession.deviceId === deviceId) {
      return existingSession;
    }
    
    // Authenticate with server
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId }),
    });

    if (!response.ok) {
      throw new Error('Failed to authenticate with server');
    }

    const data = await response.json();
    
    // Create session
    const session: Session = {
      userId: data.user.id,
      deviceId: data.user.deviceId,
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year (longer for device-based)
    };
    
    // Save session
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    return session;
  } catch (error) {
    console.error('Device authentication error:', error);
    throw new Error('Failed to authenticate device');
  }
}

// Get current session
export function getCurrentSession(): Session | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    
    const session: Session = JSON.parse(sessionData);
    
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

// Clear session (logout)
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

// Get current user ID
export function getCurrentUserId(): string | null {
  const session = getCurrentSession();
  return session?.userId || null;
}

// Get current device ID
export function getCurrentDeviceId(): string | null {
  const session = getCurrentSession();
  return session?.deviceId || null;
} 