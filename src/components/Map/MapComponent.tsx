import React, { useEffect, useState, useRef, useCallback } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl, MapRef, MapLayerMouseEvent } from '@vis.gl/react-maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../../services/supabaseClient';
import { deletePhotoFromCloudinary } from '../../services/authService';
import {
  greenIcon,
  redIcon,
  yellowIcon,
  userLocationIcon,
  constructionGreenIcon,
  constructionRedIcon,
  constructionYellowIcon,
  constructionMagentaIcon,
  constructionDarkGreyIcon,
  largeGreenIcon,
  largeRedIcon,
  largeYellowIcon,
  largeConstructionGreenIcon,
  largeConstructionRedIcon,
  largeConstructionYellowIcon,
  largeConstructionMagentaIcon,
  largeConstructionDarkGreyIcon
} from '../../constants/icons'; // eslint-disable-line @typescript-eslint/no-unused-vars

// Debounce utility function for performance optimization
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

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
    const targetBearing = -heading; // Negative because GPS heading is clockwise from north

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
      setViewState(prev => ({
        ...prev,
        longitude: initialPosition[1],
        latitude: initialPosition[0],
        zoom: mapZoom || prev.zoom
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log('📍 Centering map on GPS location:', initialPosition);
      }
    }
  }, [initialPosition, mapCenter, mapZoom]);

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

  // State for editing POI addresses
  const [editingAddress, setEditingAddress] = useState<{ [key: string]: string | undefined }>({});
  const [updatingAddress, setUpdatingAddress] = useState<Set<string>>(new Set());

  // Handle address editing for all POIs
  const handleAddressEdit = async (poiId: string, newAddress: string, anno?: number) => {
    if (!newAddress.trim() || updatingAddress.has(poiId)) return;

    console.log('🔄 Starting address edit for POI:', poiId, 'New address:', newAddress.trim());
    setUpdatingAddress(prev => new Set(prev).add(poiId));

    try {
      const { searchAddress } = await import('../../services/geocodingService');
      console.log('🔍 Calling geocoding service...');
      const searchResults = await searchAddress(newAddress.trim());

      console.log('📍 Geocoding results:', searchResults);

      let updateData: any = { indirizzo: newAddress.trim() };

      if (searchResults && searchResults.length > 0) {
        const bestResult = searchResults[0];
        const newLat = parseFloat(bestResult.lat);
        const newLng = parseFloat(bestResult.lon);

        console.log('📌 Updating coordinates - Old:', 'New:', { lat: newLat, lng: newLng });
        updateData.latitudine = newLat;
        updateData.longitudine = newLng;
      } else {
        console.warn('⚠️ No geocoding results found for address:', newAddress.trim());
      }

      console.log('💾 Update data:', updateData);

      const tableName = anno ? (anno === 2024 ? 'points_old_2024' : 'points_old_2025') : 'points';
      console.log('🗄️ Updating table:', tableName, 'for POI ID:', poiId);

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', poiId)
        .select();

      console.log('🗃️ Database update result:', { data, error });

      if (error) {
        console.error('❌ Error updating POI address:', error);
        alert('Errore durante l\'aggiornamento dell\'indirizzo');
        setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
      } else {
        console.log('✅ POI address updated successfully:', data);
        if (onPoiUpdated) {
          console.log('🔄 Calling onPoiUpdated callback');
          onPoiUpdated();
        }
        setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
      }
    } catch (error) {
      console.error('💥 Error updating POI:', error);
      alert('Errore durante l\'aggiornamento del POI');
      setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
    } finally {
      setUpdatingAddress(prev => {
        const newSet = new Set(prev);
        newSet.delete(poiId);
        return newSet;
      });
    }
  };

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
          const isConstructionType = poi.tipo === 'cantiere';
          const isHistoricalPoi = poi.anno === 2024 || poi.anno === 2025;

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

              {/* POI popup - only render when POI is selected */}
              {selectedPoiId === poi.id && (
                <Popup
                  longitude={poi.longitudine}
                  latitude={poi.latitudine}
                  anchor="bottom"
                  onClose={() => {}} // Keep POI selected when popup closes
                  closeOnClick={false}
                  maxWidth="400px"
                >
                  <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white poi-form-mobile">
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">
                        {poi.anno === 2024 || poi.anno === 2025 ? 'inserito nel db in data ' :
                         poi.ispezionabile === 1 ? 'Proposto da ispezionare in data ' :
                         poi.ispezionabile === 0 ? 'Ispezionato in data: ' :
                         poi.ispezionabile === 2 ? 'Creato in data: ' : ''}
                        {new Date(poi.created_at).toLocaleString()}
                      </p>

                      {/* Editable address */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Indirizzo (modificabile):</label>
                        <input
                          type="text"
                          value={editingAddress[poi.id] !== undefined ? editingAddress[poi.id] : poi.indirizzo || ''}
                          onChange={(e) => setEditingAddress(prev => ({ ...prev, [poi.id]: e.target.value }))}
                          onBlur={(e) => handleAddressEdit(poi.id, e.target.value, poi.anno)}
                          disabled={updatingAddress.has(poi.id)}
                          className="w-full px-2 py-1 text-sm border rounded"
                          placeholder="Inserisci indirizzo..."
                        />
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Username: {poi.username || 'N/D'}</p>
                        <p>Team: {poi.team || 'N/D'}</p>
                        <p>Tipo: {poi.tipo || 'N/D'}</p>
                        {poi.note && <p>Note: {poi.note}</p>}
                      </div>

                      {/* Action buttons - full set with permissions */}
                      <div className="space-y-2">
                        {(() => {
                          // Helper function to create share button (always visible)
                          const shareButton = (
                            <button
                              key="share"
                              onClick={(e) => {
                                e.stopPropagation();
                                const shareText = `${poi.latitudine}, ${poi.longitudine}`;
                                if (navigator.share) {
                                  navigator.share({
                                    title: `Punto di Interesse - ${poi.indirizzo}`,
                                    text: `Coordinate: ${shareText}`,
                                    url: `https://www.google.com/maps/search/?api=1&query=${poi.latitudine},${poi.longitudine}`
                                  }).catch(() => {
                                    navigator.clipboard.writeText(shareText);
                                    alert('Coordinate copiate negli appunti: ' + shareText);
                                  });
                                } else {
                                  navigator.clipboard.writeText(shareText);
                                  alert('Coordinate copiate negli appunti: ' + shareText);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-sm flex-1"
                            >
                              📤 Condividi
                            </button>
                          );

                          // Helper function to create delete button (conditional)
                          const createDeleteButton = () => {
                            let canDelete = false;
                            let buttonClass = "text-xs px-2 py-1 rounded font-medium bg-gray-400 text-gray-600 cursor-not-allowed shadow-sm flex-1";

                            // Determine if user can delete this POI
                            // Admin level 2 and 1 can always delete existing POIs
                            if (adminLevel >= 1) {
                              canDelete = true;
                            }
                            // Admin level 0 can delete green and red POIs if created by them today
                            else if (adminLevel === 0 && (poi.ispezionabile === 1 || poi.ispezionabile === 0)) {
                              const poiDate = new Date(poi.created_at);
                              const today = new Date();
                              const isCreatedToday = poiDate.getDate() === today.getDate() &&
                                                     poiDate.getMonth() === today.getMonth() &&
                                                     poiDate.getFullYear() === today.getFullYear();
                              if (isCreatedToday && poi.username === currentUsername) canDelete = true;
                            }

                            if (canDelete) {
                              buttonClass = "text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1";
                            }

                            return (
                              <button
                                key="delete"
                                onClick={canDelete ? async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Il POI verrà nascosto ma potrà essere recuperato se necessario.');
                                  if (!confirmed) return;
                                  try {
                                    let tableName = 'points';
                                    if (poi.anno) {
                                      tableName = poi.anno === 2024 ? 'points_old_2024' : 'points_old_2025';
                                    }

                                    // Soft delete: update ispezionabile to 4 and set deletion metadata
                                    const { error } = await supabase
                                      .from(tableName)
                                      .update({
                                        ispezionabile: 4,
                                        eliminatore: currentUsername,
                                        data_eliminazione: new Date().toISOString()
                                      })
                                      .eq('id', poi.id);

                                    if (!error) {
                                      if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                    } else {
                                      console.error('Error soft deleting POI:', error);
                                      alert('Errore durante l\'eliminazione del POI');
                                    }
                                  } catch (err) {
                                    console.error('Error soft deleting POI:', err);
                                    alert('Errore durante l\'eliminazione del POI');
                                  }
                                } : undefined}
                                disabled={!canDelete}
                                className={buttonClass}
                              >
                                🗑️ Elimina
                              </button>
                            );
                          };

                          // Helper function to create cantiere finito button (only for green cantieri)
                          const createCantiereFinitoButton = () => {
                            const canMarkFinished = !poi.anno && poi.ispezionabile === 1 && poi.tipo === 'cantiere' && adminLevel >= 0;
                            const buttonClass = canMarkFinished
                              ? "text-xs px-2 py-1 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-sm flex-1"
                              : "text-xs px-2 py-1 rounded font-medium bg-gray-400 text-gray-600 cursor-not-allowed shadow-sm flex-1";

                            return (
                              <button
                                key="cantiere-finito"
                                onClick={canMarkFinished ? async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Sei sicuro di voler marcare questo cantiere come finito? Il POI passerà in attesa di approvazione.');
                                  if (!confirmed) return;
                                  if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14, poi.id);
                                  try {
                                    const { error } = await supabase
                                      .from('points')
                                      .update({
                                        ispezionabile: 2,
                                        created_at: new Date().toISOString(),
                                        team: currentTeam || poi.team
                                      })
                                      .eq('id', poi.id);
                                    if (!error) {
                                      if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                    } else {
                                      alert('Errore nell\'aggiornamento del POI');
                                    }
                                  } catch (err) {
                                    console.error('Error updating POI:', err);
                                    alert('Errore nell\'aggiornamento del POI');
                                  }
                                } : undefined}
                                disabled={!canMarkFinished}
                                className={buttonClass}
                              >
                                🏗️ Cantiere finito
                              </button>
                            );
                          };

                          // Helper function to create ispezionato button (only for green POIs)
                          const createIspezionatoButton = () => {
                            const canMarkInspected = !poi.anno && poi.ispezionabile === 1 && adminLevel >= 0;
                            const buttonClass = canMarkInspected
                              ? "text-xs px-2 py-1 rounded font-medium bg-green-500 text-white hover:bg-green-600 shadow-sm flex-1"
                              : "text-xs px-2 py-1 rounded font-medium bg-gray-400 text-gray-600 cursor-not-allowed shadow-sm flex-1";

                            return (
                              <button
                                key="ispezionato"
                                onClick={canMarkInspected ? async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Sei sicuro di voler cambiare lo stato di questo punto di interesse?');
                                  if (!confirmed) return;
                                  if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14, poi.id);
                                  try {
                                    const { error } = await supabase
                                      .from('points')
                                      .update({
                                        ispezionabile: 0,
                                        created_at: new Date().toISOString(),
                                        team: currentTeam || poi.team
                                      })
                                      .eq('id', poi.id);
                                    if (!error) {
                                      if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                    }
                                  } catch (err) {
                                    console.error('Error toggling ispezionabile:', err);
                                  }
                                } : undefined}
                                disabled={!canMarkInspected}
                                className={buttonClass}
                              >
                                👮‍♂️ Ispezionato
                              </button>
                            );
                          };

                          // Helper function to create segnala inattività button (only for green cantieri)
                          const createSegnalaInattivitaButton = () => {
                            const canReportInactive = !poi.anno && poi.ispezionabile === 1 && poi.tipo === 'cantiere' && adminLevel >= 0;
                            const buttonClass = canReportInactive
                              ? "text-xs px-2 py-1 rounded font-medium bg-orange-500 text-white hover:bg-orange-600 shadow-sm flex-1"
                              : "text-xs px-2 py-1 rounded font-medium bg-gray-400 text-gray-600 cursor-not-allowed shadow-sm flex-1";

                            return (
                              <button
                                key="segnala-inattivita"
                                onClick={canReportInactive ? async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Sei sicuro di voler segnalarlo come inattivo?');
                                  if (!confirmed) return;
                                  if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14, poi.id);
                                  try {
                                    const { error } = await supabase
                                      .from('points')
                                      .update({ data_inattivita: new Date().toISOString() })
                                      .eq('id', poi.id);
                                    if (error) {
                                      alert('Errore durante la segnalazione di inattività');
                                    } else {
                                      if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                    }
                                  } catch (err) {
                                    alert('Errore durante la segnalazione di inattività');
                                  }
                                } : undefined}
                                disabled={!canReportInactive}
                                className={buttonClass}
                              >
                                ⚠️ Segnala inattività
                              </button>
                            );
                          };

                          // Fixed 5-slot layout: always same structure for uniform popup sizes
                          const buttonSlots = [
                            shareButton,                          // Slot 1: Always visible
                            createDeleteButton(),                // Slot 2: Conditional delete
                            createCantiereFinitoButton(),        // Slot 3: Only for green cantieri
                            createIspezionatoButton(),           // Slot 4: Only for green POIs
                            createSegnalaInattivitaButton()      // Slot 5: Only for green cantieri
                          ];

                          // Return fixed layout with 2 rows (3 buttons each)
                          return (
                            <>
                              <div className="flex gap-2">
                                {buttonSlots.slice(0, 3)}
                              </div>
                              <div className="flex gap-2">
                                {buttonSlots.slice(3, 5)}
                                {/* Cancel button - available for all admin levels */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onPoiSelect) onPoiSelect(null);
                                  }}
                                  className="text-xs px-2 py-1 rounded font-medium bg-red-500 text-white hover:bg-red-600 shadow-sm flex-1"
                                >
                                  ❌ Annulla
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Popup>
              )}
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
