import { useState, useEffect } from 'react';

export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Check for updates when the component mounts
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check for updates periodically (every 5 minutes)
        const checkForUpdates = () => {
          reg.update();
        };

        const interval = setInterval(checkForUpdates, 5 * 60 * 1000); // 5 minutes

        // Initial check
        checkForUpdates();

        return () => clearInterval(interval);
      });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker updated, reloading page...');
        window.location.reload();
      });
    }
  }, []);

  const updateApp = () => {
    if (registration && registration.waiting) {
      // Send message to SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  return {
    updateAvailable,
    updateApp,
    dismissUpdate
  };
};
