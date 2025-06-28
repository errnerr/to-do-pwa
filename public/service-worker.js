const CACHE_NAME = 'taskmaster-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache immediately - only include files that actually exist
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files');
        // Use addAll with error handling for individual files
        return Promise.allSettled(
          STATIC_FILES.map(url => 
            cache.add(url).catch(error => {
              console.warn(`Failed to cache ${url}:`, error);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('Service Worker installed');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker installation failed:', error);
        // Continue with installation even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (url.pathname.startsWith('/_next/') || url.pathname.includes('.')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  event.respondWith(handleNavigationRequest(request));
});

async function handleApiRequest(request) {
  try {
    // Try network first for API requests
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cached response if available
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page or error
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleStaticRequest(request) {
  // Cache first for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a default response for missing assets
    return new Response('', { status: 404 });
  }
}

async function handleNavigationRequest(request) {
  // Network first for navigation requests
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cached response
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline page
    return caches.match('/');
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Sync any pending tasks or data
    console.log('Performing background sync');
    // Add your sync logic here
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  let notificationData = {
    title: 'TaskMaster',
    body: 'You have a new task reminder!',
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  // Try to parse the push data as JSON
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || 'TaskMaster',
        body: payload.body || 'You have a new task reminder!',
        icon: payload.icon || '/icons/192.png',
        badge: payload.badge || '/icons/192.png',
        data: {
          ...payload.data,
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        actions: [
          {
            action: 'explore',
            title: 'View Tasks',
            icon: '/icons/128.png'
          },
          {
            action: 'close',
            title: 'Close',
            icon: '/icons/128.png'
          }
        ],
        vibrate: [100, 50, 100]
      };
    } catch (error) {
      console.log('Push data is not JSON, using default notification');
      // If it's not JSON, try to get it as text
      const textData = event.data.text();
      if (textData) {
        notificationData.body = textData;
      }
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 