import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl, MapRef, MapLayerMouseEvent } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: number; // 0 = not inspectable, 1 = inspectable, 2 = pending approval
  tipo: string;
  note?: string;
  latitudine: number;
  longitudine: number;
  da_approvare?: number;
  photo_url?: string;
  created_at: string;
  data_inattivita?: string;
  anno?: number; // Campo aggiunto per identificare POI storici (2024, 2025)
}

interface MapComponentProps {
  pois: PointOfInterest[];
  onMapClick: (lat: number, lng: number) => void;
  selectedPoi?: PointOfInterest | null;
  initialPosition?: [number, number];
  mapCenter?: [number, number] | null;
  mapZoom?: number;
  onPoiUpdated?: (poiPosition?: [number, number], zoomLevel?: number, workingPoiId?: string) => void;
  onPoiSelect?: (poi: PointOfInterest | null) => void; // Callback when POI is selected/deselected
  currentTeam?: string;
  adminLevel?: number;
  currentUsername?: string;
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
  filterShowInspectable?: boolean;
  filterShowNonInspectable?: boolean;
  filterShowPendingApproval?: boolean;
  filterShowCantiere?: boolean;
  filterShowAltro?: boolean;
  filterShow2024?: boolean;
  filterShow2025?: boolean;
  filterShowToday?: boolean;
  height?: string;
  workingPoiId?: string | null; // ID of POI currently being worked on
  selectedPoiId?: string | null; // ID of POI currently selected
  creatingNewPoi?: boolean; // Whether a new POI is currently being created
  // Rotation props
  enableRotation?: boolean; // Enable map rotation following heading
  heading?: number | null; // Current GPS heading in degrees (0-360)
}



// GPS Rotation Handler for MapLibre GL JS - Optimized
const GPSRotationHandler: React.FC<{
  enableRotation?: boolean;
  heading?: number | null;
  mapRef: React.RefObject<MapRef>;
}> = ({ enableRotation, heading, mapRef }) => {
  useEffect(() => {
    if (!enableRotation || !mapRef.current || !heading) return;

    const map = mapRef.current;
    const targetBearing = heading; // GPS heading is clockwise from north, same as map bearing

    // Only update if bearing changed significantly (increased threshold for better performance)
    const currentBearing = map.getBearing();
    if (Math.abs(currentBearing - targetBearing) > 2) { // Increased from 1 to 2 degrees
      map.rotateTo(targetBearing, { duration: 200 }); // Reduced from 500 to 200ms

      if (process.env.NODE_ENV === 'development') {
        console.log(`GPS rotation: ${targetBearing.toFixed(1)}° (heading: ${heading.toFixed(1)}°)`);
      }
    }
  }, [enableRotation, heading, mapRef]);

  return null;
};

// Manual Rotation Handler for right-click rotation
const ManualRotationHandler: React.FC<{
  enableRotation?: boolean;
  mapRef: React.RefObject<MapRef>;
}> = ({ enableRotation, mapRef }) => {
  useEffect(() => {
    if (!enableRotation || !mapRef.current) return;

    const map = mapRef.current;
    let isRightMouseDown = false;
    let startAngle = 0;
    let currentBearing = 0;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) { // Right mouse button
        e.preventDefault();
        isRightMouseDown = true;

        // Get mouse position relative to map center
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const dx = e.clientX - rect.left - centerX;
        const dy = e.clientY - rect.top - centerY;
        startAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        currentBearing = map.getBearing();

        if (process.env.NODE_ENV === 'development') {
          console.log('Manual rotation started');
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRightMouseDown) return;

      e.preventDefault();

      // Get mouse position relative to map center
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const dx = e.clientX - rect.left - centerX;
      const dy = e.clientY - rect.top - centerY;
      const mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Calculate new bearing
      const angleDiff = mouseAngle - startAngle;
      const newBearing = currentBearing + angleDiff;

      // Apply rotation
      map.rotateTo(newBearing, { duration: 0 });

      if (process.env.NODE_ENV === 'development') {
        console.log(`Manual rotation: ${newBearing.toFixed(1)}°`);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDown = false;
        if (process.env.NODE_ENV === 'development') {
          console.log('Manual rotation ended');
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent context menu
    };

    // Add event listeners to map container
    const mapContainer = map.getContainer();
    mapContainer.addEventListener('mousedown', handleMouseDown);
    mapContainer.addEventListener('mousemove', handleMouseMove);
    mapContainer.addEventListener('mouseup', handleMouseUp);
    mapContainer.addEventListener('contextmenu', handleContextMenu);

    return () => {
      mapContainer.removeEventListener('mousedown', handleMouseDown);
      mapContainer.removeEventListener('mousemove', handleMouseMove);
      mapContainer.removeEventListener('mouseup', handleMouseUp);
      mapContainer.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enableRotation, mapRef]);

  return null;
};

const MapComponent: React.FC<MapComponentProps> = React.memo(({
  pois,
  onMapClick,
  selectedPoi,
  initialPosition,
  mapCenter,
  mapZoom,
  onPoiUpdated,
  onPoiSelect,
  currentTeam,
  adminLevel = 0,
  currentUsername,
  newPoiLocation,
  onAddPoi,
  onCancelAddPoi,
  filterShowInspectable = true,
  filterShowNonInspectable = true,
  filterShowPendingApproval = true,
  filterShowCantiere = true,
  filterShowAltro = true,
  filterShow2024 = false,
  filterShow2025 = false,
  filterShowToday = false,
  height,
  workingPoiId = null,
  selectedPoiId = null,
  creatingNewPoi = false,
  enableRotation,
  heading
}) => {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: initialPosition?.[1] || 12.4964, // Back to Rome (original position)
    latitude: initialPosition?.[0] || 41.9028,  // Back to Rome (original position)
    zoom: mapZoom || 13,                        // Back to city zoom (original)
    bearing: 0,
    pitch: 0
  });

  // Update view state when initial position becomes available (GPS location)
  useEffect(() => {
    if (initialPosition && !mapCenter) {
      // Only center on GPS if user hasn't manually centered the map
      // Preserve manual zoom by using prev.zoom instead of mapZoom
      setViewState(prev => ({
        ...prev,
        longitude: initialPosition[1],
        latitude: initialPosition[0],
        zoom: prev.zoom // Always preserve manual zoom
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log('📍 Centering map on GPS location:', initialPosition);
      }
    }
  }, [initialPosition, mapCenter]);

  // Update view state when center or zoom changes
  useEffect(() => {
    if (mapCenter) {
      setViewState(prev => ({
        ...prev,
        longitude: mapCenter[1],
        latitude: mapCenter[0],
        zoom: mapZoom || prev.zoom
      }));
    }
  }, [mapCenter, mapZoom]);



  // Handle map clicks
  const handleMapClick = useCallback((event: MapLayerMouseEvent) => {
    if (onMapClick) {
      onMapClick(event.lngLat.lat, event.lngLat.lng);
    }
  }, [onMapClick]);



  // Filter POIs based on current filters and viewport for performance
  const filteredPois = pois.filter((poi) => {
    // Always exclude soft deleted POIs (ispezionabile === 4)
    if (poi.ispezionabile === 4) return false;

    if (filterShowToday) {
      const poiDate = new Date(poi.created_at);
      const today = new Date();
      const isToday = poiDate.getDate() === today.getDate() &&
                     poiDate.getMonth() === today.getMonth() &&
                     poiDate.getFullYear() === today.getFullYear();
      if (!isToday) return false;
    }

    if (poi.anno) {
      if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
      if (poi.tipo === 'altro' && !filterShowAltro) return false;
      if (poi.anno === 2024 && !filterShow2024) return false;
      if (poi.anno === 2025 && !filterShow2025) return false;
      return true;
    }

    if (poi.ispezionabile === 1 && !filterShowInspectable) return false;
    if (poi.ispezionabile === 0 && !filterShowNonInspectable) return false;
    if (poi.ispezionabile === 2 && !filterShowPendingApproval) return false;
    if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
    if (poi.tipo === 'altro' && !filterShowAltro) return false;
    return true;
  });

  // DISABLED: Virtualize markers for MAXIMUM FLUIDITY - show all filtered POIs always
  // This consumes more resources but provides buttery smooth navigation
  const visiblePois = filteredPois; // Always render all filtered POIs

  // DISABLED: Debounced view state update for MAXIMUM FLUIDITY
  // Direct state updates for buttery smooth navigation (higher resource usage)

  return (
    <div style={{ height: height || '100%', width: '100%', position: 'relative' }}>
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)} // Direct updates for maximum fluidity
        onClick={handleMapClick}
        ref={mapRef}
        style={{ width: '100%', height: '100%' }}

        // Advanced MapLibre GL JS optimizations for global navigation
        minZoom={1}                           // Global view
        maxZoom={20}                          // Street level detail
        dragRotate={false}                    // No accidental mouse rotation
        touchZoomRotate={true}                // Keep manual mobile rotation
        renderWorldCopies={false}             // No world copies for cleaner map
        pitchWithRotate={false}               // No tilt during rotation

        mapStyle={{
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              // Performance optimization for raster tiles
              maxzoom: 20,
              minzoom: 0
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            // Additional performance hints
            paint: {
              'raster-fade-duration': 0  // Instant tile transitions
            }
          }]
        }}
      >
        {/* Navigation controls */}
        <NavigationControl position="top-right" />

        {/* GPS location control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
        />

        {/* User's current location marker */}
        {initialPosition && (
          <Marker
            longitude={initialPosition[1]}
            latitude={initialPosition[0]}
            anchor="bottom"
          >
            <div style={{
              fontSize: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              👮‍♂️
            </div>
          </Marker>
        )}

        {/* POI markers - using virtualized visible POIs for better performance */}
        {visiblePois.map((poi) => {
          // Determine marker color and icon based on POI status and year
          const isWorkingOrSelected = workingPoiId === poi.id || selectedPoiId === poi.id;

          // Debug logging for selected POI size
          if (process.env.NODE_ENV === 'development') {
            if (isWorkingOrSelected) {
              console.log('🎯 POI selezionato/grande:', poi.id, 'workingPoiId:', workingPoiId, 'selectedPoiId:', selectedPoiId, 'size: 45px');
            }
          }

          let markerColor = '#10B981'; // Default green for inspectable
          let markerIcon = '✅'; // Default checkmark for inspectable

          // Scalable marker size based on zoom level for better usability at high zoom
          const baseSize = 30;
          const selectedSize = 45;
          const zoomScale = Math.max(0, (viewState.zoom - 10) * 2); // Scale factor starting from zoom 10
          let markerSize = Math.min(baseSize + zoomScale, 60); // Max 60px to avoid oversized markers

          if (isWorkingOrSelected) {
            markerSize = Math.min(selectedSize + zoomScale, 75); // Larger for selected/working, max 75px
          }

          // Icon based on POI type
          if (poi.tipo === 'cantiere') {
            markerIcon = '🏗️'; // Construction crane for all construction sites
          } else if (poi.tipo === 'altro') {
            markerIcon = '📍'; // Pushpin for other POI types (Google Maps POI symbol)
          } else {
            markerIcon = '📍'; // Default to pushpin for unknown types
          }

          // Color based on priority order
          if (poi.anno === 2024) {
            markerColor = '#D946EF'; // Magenta for 2024
          } else if (poi.anno === 2025) {
            markerColor = '#6B7280'; // Grey for 2025
          } else if (poi.ispezionabile === 0) {
            markerColor = '#EF4444'; // Red for inspected
          } else if (poi.ispezionabile === 1) {
            markerColor = '#10B981'; // Green for inspectable
          } else if (poi.ispezionabile === 2) {
            markerColor = '#F59E0B'; // Yellow for pending approval
          } else {
            markerColor = '#10B981'; // Default green
          }

          return (
            <Marker
              key={`${poi.id}-${poi.anno || 'current'}-${poi.created_at}`}
              longitude={poi.longitudine}
              latitude={poi.latitudine}
              anchor="bottom"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation();
                if (onPoiSelect) onPoiSelect(poi);
              }}
            >
              <div style={{
                background: markerColor,
                border: '2px solid white',
                borderRadius: '50%',
                width: `${markerSize}px`,
                height: `${markerSize}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: isWorkingOrSelected ? '18px' : '14px',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}>
                {markerIcon}
              </div>


            </Marker>
          );
        })}

        {/* GPS and Manual Rotation Handlers */}
        <GPSRotationHandler
          enableRotation={enableRotation}
          heading={heading}
          mapRef={mapRef}
        />
        <ManualRotationHandler
          enableRotation={enableRotation}
          mapRef={mapRef}
        />
      </Map>
    </div>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;
