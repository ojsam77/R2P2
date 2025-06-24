// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              showUpdateNotification();
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

// Show update notification
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <p>🔄 New version available!</p>
      <button onclick="updateApp()" class="update-btn">Update Now</button>
      <button onclick="dismissUpdate()" class="dismiss-btn">Later</button>
    </div>
  `;
  
  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .update-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2e3192;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    }
    
    .update-content {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .update-btn, .dismiss-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .update-btn {
      background: #0ca756;
      color: white;
    }
    
    .update-btn:hover {
      background: #0a8a45;
    }
    
    .dismiss-btn {
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
    }
    
    .dismiss-btn:hover {
      background: rgba(255,255,255,0.1);
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @media (max-width: 768px) {
      .update-notification {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `;
  
  document.head.appendChild(styles);
  document.body.appendChild(notification);
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      dismissUpdate();
    }
  }, 10000);
}

// Update the app
function updateApp() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

// Dismiss update notification
function dismissUpdate() {
  const notification = document.querySelector('.update-notification');
  if (notification) {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

// Add slideOut animation
const slideOutStyle = document.createElement('style');
slideOutStyle.textContent = `
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(slideOutStyle);

// Performance monitoring
if ('performance' in window) {
  // Monitor Core Web Vitals
  if ('web-vital' in window) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log);
      getFID(console.log);
      getFCP(console.log);
      getLCP(console.log);
      getTTFB(console.log);
    });
  }
  
  // Monitor page load performance
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        console.log('Page Load Performance:', {
          'DOM Content Loaded': perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          'Load Complete': perfData.loadEventEnd - perfData.loadEventStart,
          'Total Load Time': perfData.loadEventEnd - perfData.fetchStart
        });
      }
    }, 0);
  });
}

// Offline detection
window.addEventListener('online', () => {
  console.log('App is online');
  // Remove any offline indicators
  const offlineIndicator = document.querySelector('.offline-indicator');
  if (offlineIndicator) {
    offlineIndicator.remove();
  }
});

window.addEventListener('offline', () => {
  console.log('App is offline');
  showOfflineIndicator();
});

function showOfflineIndicator() {
  if (!document.querySelector('.offline-indicator')) {
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.innerHTML = `
      <div class="offline-content">
        <span>📶 You're offline</span>
        <span>Some features may be limited</span>
      </div>
    `;
    
    const styles = document.createElement('style');
    styles.textContent = `
      .offline-indicator {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #ff6b6b;
        color: white;
        padding: 0.5rem;
        text-align: center;
        z-index: 10001;
        font-size: 0.9rem;
      }
      
      .offline-content {
        display: flex;
        justify-content: center;
        gap: 1rem;
        align-items: center;
      }
      
      @media (max-width: 768px) {
        .offline-content {
          flex-direction: column;
          gap: 0.25rem;
        }
      }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(indicator);
  }
}

// Install prompt for PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

function showInstallPrompt() {
  const installButton = document.createElement('div');
  installButton.className = 'install-prompt';
  installButton.innerHTML = `
    <div class="install-content">
      <p>📱 Install R2P2 Wellness App</p>
      <button onclick="installApp()" class="install-btn">Install</button>
      <button onclick="dismissInstall()" class="dismiss-install-btn">Not Now</button>
    </div>
  `;
  
  const styles = document.createElement('style');
  styles.textContent = `
    .install-prompt {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: #2e3192;
      color: white;
      padding: 1rem;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideUp 0.3s ease;
    }
    
    .install-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    
    .install-btn, .dismiss-install-btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }
    
    .install-btn {
      background: #0ca756;
      color: white;
    }
    
    .install-btn:hover {
      background: #0a8a45;
    }
    
    .dismiss-install-btn {
      background: transparent;
      color: white;
      border: 1px solid rgba(255,255,255,0.3);
    }
    
    .dismiss-install-btn:hover {
      background: rgba(255,255,255,0.1);
    }
    
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    @media (max-width: 768px) {
      .install-content {
        flex-direction: column;
        gap: 0.5rem;
      }
    }
  `;
  
  document.head.appendChild(styles);
  document.body.appendChild(installButton);
}

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
      dismissInstall();
    });
  }
}

function dismissInstall() {
  const prompt = document.querySelector('.install-prompt');
  if (prompt) {
    prompt.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.parentNode.removeChild(prompt);
      }
    }, 300);
  }
}

// Add slideDown animation
const slideDownStyle = document.createElement('style');
slideDownStyle.textContent = `
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(slideDownStyle); 