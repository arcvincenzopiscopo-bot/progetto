import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../services/supabaseClient';

// Fix for missing marker icons in production
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: boolean;
  latitudine: number;
  longitudine: number;
  created_at: string;
}

interface MapComponentProps {
  pois: PointOfInterest[];
  onMapClick: (lat: number, lng: number) => void;
  selectedPoi?: PointOfInterest | null;
  initialPosition?: [number, number];
  onPoiUpdated?: () => void;
  currentTeam?: string;
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number) => void;
  onCancelAddPoi?: () => void;
  filterShowInspectable?: boolean;
  filterShowNonInspectable?: boolean;
  height?: string;
}

// Fix for default marker icons in React
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons for inspectable and non-inspectable points
const greenIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number) => void;
  onCancelAddPoi?: () => void;
}> = ({ onMapClick, newPoiLocation, onAddPoi, onCancelAddPoi }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ lat: number; lng: number } | null>(null);

  const map = useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      setClickPosition({ lat, lng });
      setShowPopup(true);
      onMapClick(lat, lng);
    },
  });

  // Automatically show popup when newPoiLocation is provided
  useEffect(() => {
    if (newPoiLocation) {
      setClickPosition(newPoiLocation);
      setShowPopup(true);
    }
  }, [newPoiLocation]);

  return (
    <>
      {showPopup && clickPosition && (
        <Marker position={[clickPosition.lat, clickPosition.lng]} icon={defaultIcon}>
          <Popup>
            <div className="space-y-2">
              <h3 className="font-bold text-center bg-indigo-600 text-white py-2 rounded">Aggiungi Punto di Interesse</h3>
              <div>
                <label htmlFor="add-poi-indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo
                </label>
                <input
                  id="add-poi-indirizzo"
                  type="text"
                  defaultValue={`Lat: ${clickPosition.lat.toFixed(6)}, Lng: ${clickPosition.lng.toFixed(6)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="add-poi-ispezionabile" className="block text-sm font-medium text-gray-700 mb-1">
                  Ispezionabile
                </label>
                <select
                  id="add-poi-ispezionabile"
                  defaultValue={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={1}>Sì</option>
                  <option value={0}>No</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const indirizzo = `Lat: ${clickPosition.lat.toFixed(6)}, Lng: ${clickPosition.lng.toFixed(6)}`;
                    const ispezionabile = (document.getElementById('add-poi-ispezionabile') as HTMLSelectElement).value;
                    if (onAddPoi) {
                      onAddPoi(indirizzo, Number(ispezionabile));
                    }
                    setShowPopup(false);
                  }}
                >
                  Aggiungi
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(false);
                  }}
                >
                  Annulla
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ pois, onMapClick, selectedPoi, initialPosition, onPoiUpdated, currentTeam, newPoiLocation, onAddPoi, onCancelAddPoi, filterShowInspectable = true, filterShowNonInspectable = true, height }) => {
  // Use initial position if provided, otherwise default to Rome coordinates
  const centerPosition: [number, number] = initialPosition || [41.9028, 12.4964];
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    // Force re-render when initialPosition changes
    if (initialPosition) {
      setMapKey(Date.now());
    }
  }, [initialPosition]);

  return (
    <MapContainer
      key={mapKey}
      center={centerPosition}
      zoom={13}
      style={{ height: height || '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {pois
        .filter((poi) => {
          // Filter POIs based on filter settings
          if (poi.ispezionabile && !filterShowInspectable) return false;
          if (!poi.ispezionabile && !filterShowNonInspectable) return false;
          return true;
        })
        .map((poi) => {
        // Determine which icon to use based on ispezionabile field
        // ispezionabile = 1 (true) -> green marker
        // ispezionabile = 0 (false) -> red marker
        const markerIcon = poi.ispezionabile ? greenIcon : redIcon;

        return (
          <Marker
            key={poi.id}
            position={[poi.latitudine, poi.longitudine]}
            icon={markerIcon}
            eventHandlers={{
              click: () => {
                // You could add additional click handling here if needed
              },
            }}
          >
            <Popup>
              <div>
                <h3 className="font-bold">{new Date(poi.created_at).toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Team: {poi.team || 'N/D'}</p>
                <div className="mt-2 space-y-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // Toggle the ispezionabile value
                        const newValue = poi.ispezionabile ? 0 : 1;
                        const { error } = await supabase
                          .from('points')
                          .update({
                            ispezionabile: newValue,
                            created_at: new Date().toISOString(),
                            team: currentTeam || poi.team
                          })
                          .eq('id', poi.id);

                        if (error) {
                          console.error('Error updating ispezionabile:', error);
                        } else {
                          // Force re-render to update the marker color
                          setMapKey(Date.now());
                          // Refresh the POI data in the parent component
                          if (onPoiUpdated) {
                            onPoiUpdated();
                          }
                        }
                      } catch (err) {
                        console.error('Error toggling ispezionabile:', err);
                      }
                    }}
                    className={`text-sm px-3 py-2 rounded w-full font-medium shadow-sm ${
                      poi.ispezionabile
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                  >
                    {poi.ispezionabile ? '🟢 Ispezionabile' : '🔴 Non Ispezionabile'}
                  </button>

                  {/* Delete button - only visible for records created today */}
                  {(() => {
                    const poiDate = new Date(poi.created_at);
                    const today = new Date();
                    const isCreatedToday =
                      poiDate.getDate() === today.getDate() &&
                      poiDate.getMonth() === today.getMonth() &&
                      poiDate.getFullYear() === today.getFullYear();

                    return isCreatedToday && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const { error } = await supabase
                              .from('points')
                              .delete()
                              .eq('id', poi.id);

                            if (error) {
                              console.error('Error deleting POI:', error);
                            } else {
                              // Refresh the POI data in the parent component
                              if (onPoiUpdated) {
                                onPoiUpdated();
                              }
                            }
                          } catch (err) {
                            console.error('Error deleting POI:', err);
                          }
                        }}
                        className="text-sm px-3 py-2 rounded w-full font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm"
                      >
                        🗑️ Elimina Punto
                      </button>
                    );
                  })()}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Add POI Form Popup - appears when adding a new POI */}
      {newPoiLocation && (
        <Marker
          position={[newPoiLocation.lat, newPoiLocation.lng]}
          icon={defaultIcon}
          eventHandlers={{
            click: () => {
              // This ensures the popup opens automatically when the marker is clicked
              // The popup should open automatically since we're using Leaflet's Popup component
            }
          }}
        >
          <Popup autoPan={true} autoClose={false}>
            <div className="space-y-2">
              <h3 className="font-bold text-center bg-indigo-600 text-white py-2 rounded">Aggiungi Punto di Interesse</h3>
              <div>
                <label htmlFor="add-poi-indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo
                </label>
                <input
                  id="add-poi-indirizzo"
                  type="text"
                  defaultValue={`Lat: ${newPoiLocation.lat.toFixed(6)}, Lng: ${newPoiLocation.lng.toFixed(6)}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  readOnly
                />
              </div>
              <div>
                <label htmlFor="add-poi-ispezionabile" className="block text-sm font-medium text-gray-700 mb-1">
                  Ispezionabile
                </label>
                <select
                  id="add-poi-ispezionabile"
                  defaultValue={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value={1}>Sì</option>
                  <option value={0}>No</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const indirizzo = `Lat: ${newPoiLocation.lat.toFixed(6)}, Lng: ${newPoiLocation.lng.toFixed(6)}`;
                    const ispezionabile = (document.getElementById('add-poi-ispezionabile') as HTMLSelectElement).value;
                    if (onAddPoi) {
                      onAddPoi(indirizzo, Number(ispezionabile));
                    }
                  }}
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 font-medium shadow-sm text-sm"
                >
                  📍 Aggiungi Punto
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCancelAddPoi) {
                      onCancelAddPoi();
                    }
                  }}
                  className="flex-1 bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 font-medium shadow-sm text-sm"
                >
                  ❌ Annulla
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  );
};

export default MapComponent;
