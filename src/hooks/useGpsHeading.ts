import { useState, useEffect } from 'react';

/**
 * Custom hook to extract and manage GPS heading data from geolocation watchPosition
 * @returns Object containing current heading, accuracy, and timestamp
 */
export function useGpsHeading() {
  const [gpsData, setGpsData] = useState<{
    heading: number | null;
    headingAccuracy: number | null;
    timestamp: number | null;
    isAvailable: boolean;
  }>({
    heading: null,
    headingAccuracy: null,
    timestamp: null,
    isAvailable: false,
  });

  useEffect(() => {
    let watchId: number | null = null;

    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    // Start watching position with high accuracy for compass data
    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Extract heading data if available
          const heading = position.coords.heading !== null && position.coords.heading !== undefined
            ? position.coords.heading
            : null;

          // Extract heading accuracy if available
          const headingAccuracy = position.coords.heading !== null && position.coords.heading !== undefined
            ? (position.coords as any).headingAccuracy || null
            : null;

          setGpsData({
            heading,
            headingAccuracy,
            timestamp: Date.now(),
            isAvailable: heading !== null,
          });

          // Log heading data for debugging
          if (process.env.NODE_ENV === 'development') {
            if (heading !== null) {
              console.log(`GPS Heading: ${heading.toFixed(1)}°`, `Accuracy: ${headingAccuracy !== null ? headingAccuracy.toFixed(1) + '°' : 'N/A'}`);
            } else {
              console.log('GPS Heading: Not available (device may not have compass or is not moving)');
            }
          }
        },
        (error) => {
          console.error('GPS Heading Error:', error.message);
          if (error.code === 1) {
            console.warn('GPS: User denied location access');
          } else if (error.code === 2) {
            console.warn('GPS: Position unavailable');
          } else if (error.code === 3) {
            console.warn('GPS: Position request timeout');
          }

          setGpsData(prev => ({
            ...prev,
            isAvailable: false,
          }));
        },
        {
          enableHighAccuracy: true, // Required for compass/heading data
          timeout: 10000,
          maximumAge: 1000,
        }
      );
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - stop GPS to save battery
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
          console.log('GPS Heading: Stopped watching (page hidden)');
        }
      } else {
        // Page is visible - restart GPS monitoring
        if (watchId === null) {
          startWatching();
          console.log('GPS Heading: Restarted watching (page visible)');
        }
      }
    };

    // Start watching initially if page is visible
    if (!document.hidden) {
      startWatching();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('GPS Heading: Cleanup - stopped watching');
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return gpsData;
}
