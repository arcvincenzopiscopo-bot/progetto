import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to extract and manage GPS heading data from geolocation watchPosition
 * Provides interpolated heading updates for smooth rotation (GPS hardware every 2.5s, heading updates every 500ms)
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

  // Store for interpolation between GPS readings
  const lastGpsHeadingRef = useRef<number | null>(null);
  const lastGpsTimeRef = useRef<number | null>(null);
  const interpolationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

          const currentTime = Date.now();

          // Store GPS reading for interpolation
          lastGpsHeadingRef.current = heading;
          lastGpsTimeRef.current = currentTime;

          setGpsData({
            heading,
            headingAccuracy,
            timestamp: currentTime,
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

    // Start interpolation timer for smooth heading updates (every 500ms)
    const startInterpolation = () => {
      if (interpolationIntervalRef.current) return; // Already running

      interpolationIntervalRef.current = setInterval(() => {
        const currentTime = Date.now();
        const lastGpsTime = lastGpsTimeRef.current;
        const lastGpsHeading = lastGpsHeadingRef.current;

        if (lastGpsTime && lastGpsHeading !== null) {
          // Calculate time since last GPS reading
          const timeSinceLastGps = currentTime - lastGpsTime;

          // If it's been more than 3 seconds since last GPS reading, stop interpolation
          if (timeSinceLastGps > 3000) {
            return;
          }

          // For now, just use the last GPS heading (could implement prediction here)
          // In a more advanced implementation, we could predict heading based on trend
          setGpsData(prev => ({
            ...prev,
            heading: lastGpsHeading,
            timestamp: currentTime,
            isAvailable: true,
          }));

          if (process.env.NODE_ENV === 'development') {
            console.log(`Interpolated Heading: ${lastGpsHeading.toFixed(1)}° (${timeSinceLastGps}ms since GPS)`);
          }
        }
      }, 500); // Update every 500ms for smooth rotation
    };

    // Stop interpolation timer
    const stopInterpolation = () => {
      if (interpolationIntervalRef.current) {
        clearInterval(interpolationIntervalRef.current);
        interpolationIntervalRef.current = null;
      }
    };

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - stop GPS and interpolation to save battery
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
          console.log('GPS Heading: Stopped watching (page hidden)');
        }
        stopInterpolation();
      } else {
        // Page is visible - restart GPS monitoring and interpolation
        if (watchId === null) {
          startWatching();
          console.log('GPS Heading: Restarted watching (page visible)');
        }
        startInterpolation();
      }
    };

    // Start watching initially if page is visible
    if (!document.hidden) {
      startWatching();
      startInterpolation();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('GPS Heading: Cleanup - stopped watching');
      }
      stopInterpolation();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return gpsData;
}
