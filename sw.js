const CACHE_NAME = 'r2p2-wellness-v1.0.0';
const STATIC_CACHE = 'r2p2-static-v1.0.0';
const DYNAMIC_CACHE = 'r2p2-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/index.css',
  '/jquery.min.js',
  '/jquery.ripples.js',
  '/src/main.jsx',
  '/src/assets/R2P2Logo.png',
  '/src/assets/Lotus Flower.png',
  '/R2P2.svg',
  '/images/fb.svg',
  '/images/twitter.svg',
  '/images/instagram-icon.svg',
  '/images/Vector-white.svg',
  '/Abouts Us.html',
  '/Services.html',
  '/Testimonial.html',
  '/Schedule.html',
  '/Nutrition.html',
  '/Healing.html',
  '/Movement.html',
  '/Yoga.html'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (except for critical resources)
  if (url.origin !== self.location.origin) {
    // Allow Google Calendar and other essential external resources
    if (url.hostname.includes('calendar.google.com') || 
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')) {
      return;
    }
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Clone the request for network fetch
        const fetchRequest = request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Check if response is valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            
            // Return offline page for HTML requests
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Return placeholder for images
            if (request.headers.get('accept').includes('image')) {
              return caches.match('/src/assets/R2P2Logo.png');
            }
          });
      })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Handle any pending offline actions
    console.log('Processing background sync...');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update from R2P2 Wellness',
    icon: '/src/assets/R2P2Logo.png',
    badge: '/src/assets/R2P2Logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Services',
        icon: '/src/assets/R2P2Logo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/src/assets/R2P2Logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('R2P2 Wellness', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/Services.html')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the main page
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Cache size management
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const cachePromises = cacheNames.map(cacheName => {
    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
      return caches.delete(cacheName);
    }
  });
  
  await Promise.all(cachePromises);
}

// Periodic cache cleanup
setInterval(cleanOldCaches, 24 * 60 * 60 * 1000); // Daily cleanup 