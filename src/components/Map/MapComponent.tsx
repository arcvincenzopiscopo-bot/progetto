import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../services/supabaseClient';
import { deletePhotoFromCloudinary } from '../../services/authService';
import { getAddressWithCache } from '../../services/geocodingService';

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
  onPoiUpdated?: () => void;
  currentTeam?: string;
  isAdmin?: boolean;
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

// Custom icons for inspectable, non-inspectable and pending approval points
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

const yellowIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons for historical POIs (magenta for 2024, blue for 2025)
const magentaIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const darkGreyIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom circular icon for user's location with police officer
const userLocationIcon = L.divIcon({
  html: `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #2563eb;
      border: 3px solid white;
      box-shadow: 0 3px 6px rgba(0,0,0,0.4);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    ">
      👮‍♂️
    </div>
  `,
  className: 'custom-user-location-icon',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
}> = ({ onMapClick, newPoiLocation, onAddPoi, onCancelAddPoi }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [ispezionabile, setIspezionabile] = useState('1');
  const [tipo, setTipo] = useState('cantiere');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setClickPosition({ lat, lng });
      setShowPopup(true);
      onMapClick(lat, lng);

      // Try to get address using geocoding service
      try {
        setIsLoadingAddress(true);
        const result = await getAddressWithCache(lat, lng);
        if (result.success && result.address) {
          setAddress(result.address);
        } else {
          // Fallback to coordinates if geocoding fails
          setAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Error getting address:', error);
        setAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
      } finally {
        setIsLoadingAddress(false);
      }
    },
  });

  // Automatically show popup when newPoiLocation is provided
  useEffect(() => {
    if (newPoiLocation) {
      setClickPosition(newPoiLocation);
      setShowPopup(true);
      // Reset form state when opening
      setIspezionabile('1');
      setTipo('cantiere');
      setNote('');

      // Try to get address for the new location
      const fetchAddress = async () => {
        try {
          setIsLoadingAddress(true);
          const result = await getAddressWithCache(newPoiLocation.lat, newPoiLocation.lng);
          if (result.success && result.address) {
            setAddress(result.address);
          } else {
            // Fallback to coordinates if geocoding fails
            setAddress(`Lat: ${newPoiLocation.lat.toFixed(6)}, Lng: ${newPoiLocation.lng.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Error getting address:', error);
          setAddress(`Lat: ${newPoiLocation.lat.toFixed(6)}, Lng: ${newPoiLocation.lng.toFixed(6)}`);
        } finally {
          setIsLoadingAddress(false);
        }
      };

      fetchAddress();
    }
  }, [newPoiLocation]);

  const handleAddPoi = () => {
    console.log('handleAddPoi called');
    console.log('clickPosition:', clickPosition);
    console.log('onAddPoi:', onAddPoi);
    console.log('ispezionabile:', ispezionabile);
    console.log('tipo:', tipo);
    console.log('note:', note);
    console.log('address:', address);

    if (!clickPosition) {
      console.error('clickPosition is null');
      return;
    }
    if (!onAddPoi) {
      console.error('onAddPoi is not defined');
      return;
    }

    // Use the address from geocoding service, fallback to coordinates if not available
    const indirizzo = address || `Lat: ${clickPosition.lat.toFixed(6)}, Lng: ${clickPosition.lng.toFixed(6)}`;
    console.log('Calling onAddPoi with:', indirizzo, Number(ispezionabile), tipo, note);

    try {
      onAddPoi(indirizzo, Number(ispezionabile), tipo, note, photo || undefined);
      console.log('onAddPoi completed successfully');
    } catch (error) {
      console.error('Error in onAddPoi:', error);
    }

    setShowPopup(false);
  };

  return (
    <>
      {showPopup && clickPosition && (
        <Marker position={[clickPosition.lat, clickPosition.lng]} icon={defaultIcon}>
          <Popup maxWidth={600} minWidth={250} className="leaflet-popup-content-wrapper">
            <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white">
              <div className="space-y-3">

                <div>
                  <label htmlFor="add-poi-indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo
                  </label>
                  <input
                    id="add-poi-indirizzo"
                    type="text"
                    value={isLoadingAddress ? "Caricamento indirizzo..." : address}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    readOnly
                    maxLength={20}
                  />
                </div>

                <div>
                  <label htmlFor="add-poi-ispezionabile" className="block text-sm font-medium text-gray-700 mb-1">
                    Ispezionabile
                  </label>
                  <select
                    id="add-poi-ispezionabile"
                    value={ispezionabile}
                    onChange={(e) => setIspezionabile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="1">Sì</option>
                    <option value="0">No</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-poi-tipo" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="add-poi-tipo"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="cantiere">Cantiere</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="add-poi-note" className="block text-sm font-medium text-gray-700 mb-1">
                    Note (max 20 caratteri)
                  </label>
                  <input
                    id="add-poi-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Inserisci note..."
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="add-poi-photo" className="block text-sm font-medium text-gray-700 mb-1">
                    📷 Foto (opzionale)
                  </label>
                  <input
                    id="add-poi-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPhoto(file);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={handleAddPoi}
                    className="bg-green-500 text-white py-1 px-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-xs font-medium"
                  >
                    📍 Aggiungi Punto
                  </button>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs font-medium"
                  >
                    ❌ Annulla
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
};

// Unified POI Form Popup component with consistent styling
const POIFormPopup: React.FC<{
  location: { lat: number; lng: number };
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
}> = ({ location, onAddPoi, onCancelAddPoi }) => {
  const [address, setAddress] = useState<string>('');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [ispezionabile, setIspezionabile] = useState('1');
  const [tipo, setTipo] = useState('cantiere');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  // Fetch address when component mounts
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        setIsLoadingAddress(true);
        const result = await getAddressWithCache(location.lat, location.lng);
        if (result.success && result.address) {
          setAddress(result.address);
        } else {
          // Fallback to coordinates if geocoding fails
          setAddress(`Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Error getting address:', error);
        setAddress(`Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`);
      } finally {
        setIsLoadingAddress(false);
      }
    };

    fetchAddress();
  }, [location.lat, location.lng]);

  const handleAddPoi = () => {
    if (!onAddPoi) return;

    // Use the address from geocoding service, fallback to coordinates if not available
    const indirizzo = address || `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
    onAddPoi(indirizzo, Number(ispezionabile), tipo, note, photo || undefined);
  };

  return (
    <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white">
      <div className="space-y-3">

        <div>
          <label htmlFor="add-poi-indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo
          </label>
          <input
            id="add-poi-indirizzo"
            type="text"
            value={isLoadingAddress ? "Caricamento indirizzo..." : address}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            readOnly
            maxLength={20}
          />
        </div>

        <div>
          <label htmlFor="add-poi-ispezionabile" className="block text-sm font-medium text-gray-700 mb-1">
            Ispezionabile
          </label>
          <select
            id="add-poi-ispezionabile"
            value={ispezionabile}
            onChange={(e) => setIspezionabile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="1">Sì</option>
            <option value="0">No</option>
          </select>
        </div>

        <div>
          <label htmlFor="add-poi-tipo" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="add-poi-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="cantiere">Cantiere</option>
            <option value="altro">Altro</option>
          </select>
        </div>

        <div>
          <label htmlFor="add-poi-note" className="block text-sm font-medium text-gray-700 mb-1">
            Note (max 20 caratteri)
          </label>
          <input
            id="add-poi-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Inserisci note..."
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="add-poi-photo" className="block text-sm font-medium text-gray-700 mb-1">
            📷 Foto (opzionale)
          </label>
          <input
            id="add-poi-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setPhoto(file);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex space-x-2 pt-2">
          <button
            onClick={handleAddPoi}
            className="bg-green-500 text-white py-1 px-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-xs font-medium"
          >
            📍 Aggiungi Punto
          </button>
          <button
            onClick={() => onCancelAddPoi && onCancelAddPoi()}
            className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs font-medium"
          >
            ❌ Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ pois, onMapClick, selectedPoi, initialPosition, onPoiUpdated, currentTeam, isAdmin = false, newPoiLocation, onAddPoi, onCancelAddPoi, filterShowInspectable = true, filterShowNonInspectable = true, filterShowPendingApproval = true, filterShowCantiere = true, filterShowAltro = true, filterShow2024 = false, filterShow2025 = false, height }) => {
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

      {/* User's current location marker */}
      {initialPosition && (
        <Marker
          position={initialPosition}
          icon={userLocationIcon}
          eventHandlers={{
            click: () => {
              // Optional click handling for user location
            },
          }}
        >
          <Popup>
            <div className="text-center">
              <h3 className="font-bold text-blue-600">📍 La Tua Posizione</h3>
              <p className="text-sm text-gray-600">
                Lat: {initialPosition[0].toFixed(6)}<br />
                Lng: {initialPosition[1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {pois
        .filter((poi) => {
          // Filter POIs based on filter settings
          if (poi.ispezionabile === 1 && !filterShowInspectable) return false;
          if (poi.ispezionabile === 0 && !filterShowNonInspectable) return false;
          if (poi.da_approvare === 2 && !filterShowPendingApproval) return false;
          if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
          if (poi.tipo === 'altro' && !filterShowAltro) return false;
          // Filter by year - historical POIs
          if (poi.anno === 2024 && !filterShow2024) return false;
          if (poi.anno === 2025 && !filterShow2025) return false;
          return true;
        })
        .map((poi) => {
        // Determine which icon to use based on year first, then status
        // Priority: Historical POIs (2024, 2025) -> special colored markers
        // Then: da_approvare = 2 -> yellow marker (pending approval)
        // Then: ispezionabile = 1 -> green marker, = 0 -> red marker
        let markerIcon;
        if (poi.anno === 2024) {
          markerIcon = magentaIcon; // 🟣 Magenta for 2024
        } else if (poi.anno === 2025) {
          markerIcon = darkGreyIcon; // ⚫ Dark grey for 2025
        } else if (poi.da_approvare === 2) {
          markerIcon = yellowIcon;
        } else {
          markerIcon = poi.ispezionabile === 1 ? greenIcon : redIcon;
        }

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
            <Popup maxWidth={400} minWidth={300} className="existing-poi-popup">
              <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {poi.ispezionabile === 0 ? 'Ispezionato in data: ' :
                     poi.ispezionabile === 2 ? 'Creato in data: ' : ''}
                    {new Date(poi.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">Indirizzo: {poi.indirizzo || 'N/D'}</p>
                  <p className="text-sm text-gray-600 mb-1">Username: {poi.username || 'N/D'}</p>
                  <p className="text-sm text-gray-600 mb-1">Team: {poi.team || 'N/D'}</p>
                  <p className="text-sm text-gray-600 mb-1">Tipo: {poi.tipo || 'N/D'}</p>
                  {poi.note && <p className="text-sm text-gray-600 mb-1">Note: {poi.note}</p>}
                  {poi.ispezionabile === 1 && !poi.da_approvare && poi.data_inattivita && (
                    <p className="text-sm text-gray-600 mb-1">
                      Ultima inattività: {new Date(poi.data_inattivita).toLocaleString()}
                    </p>
                  )}
                  {poi.photo_url && (
                    <div className="mt-2 mb-2">
                      <a href={poi.photo_url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={poi.photo_url}
                          alt="Foto POI"
                          className="w-24 h-24 object-cover rounded-md border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ width: '100px', height: '100px' }}
                          onError={(e) => {
                            console.error('Errore nel caricamento della foto:', poi.photo_url);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </a>
                      <p className="text-xs text-gray-500 text-center mt-1">Clicca per ingrandire</p>
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    {/* Buttons row - Condividi and Ispezionato side by side */}
                  <div className="flex gap-2">
                    {/* Share button - smaller size */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const shareText = `${poi.latitudine}, ${poi.longitudine}`;

                        if (navigator.share) {
                          // Use Web Share API for modern browsers
                          navigator.share({
                            title: `Punto di Interesse - ${poi.indirizzo}`,
                            text: `Coordinate: ${shareText}`,
                            url: `https://www.google.com/maps/search/?api=1&query=${poi.latitudine},${poi.longitudine}`
                          })
                          .then(() => console.log('Share successful'))
                          .catch((error) => {
                            console.error('Error sharing:', error);
                            // Fallback to clipboard if share fails
                            navigator.clipboard.writeText(shareText);
                            alert('Coordinate copiate negli appunti: ' + shareText);
                          });
                        } else {
                          // Fallback for browsers that don't support Web Share API
                          navigator.clipboard.writeText(shareText)
                            .then(() => alert('Coordinate copiate negli appunti: ' + shareText))
                            .catch((error) => {
                              console.error('Error copying to clipboard:', error);
                              alert('Coordinate: ' + shareText);
                            });
                        }
                      }}
                      className="text-xs px-2 py-1 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-sm flex-1"
                    >
                      📤 Condividi
                    </button>

                    {/* Ispezionato button - smaller size, only show if applicable */}
                    {poi.ispezionabile === 1 && poi.da_approvare !== 2 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          // Ask for confirmation before changing status
                          const confirmed = window.confirm('Sei sicuro di voler cambiare lo stato di questo punto di interesse?');
                          if (!confirmed) return;

                          try {
                            // Toggle the ispezionabile value
                            const newValue = poi.ispezionabile === 1 ? 0 : 1;
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
                        className={`text-xs px-2 py-1 rounded font-medium shadow-sm flex-1 ${
                          poi.ispezionabile
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        👮‍♂️ Ispezionato
                      </button>
                    )}
                  </div>

                  {/* Approve button - only for admins and POIs with da_approvare = 2 */}
                  {isAdmin && poi.da_approvare === 2 && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();

                        // Ask for confirmation before approving
                        const confirmed = window.confirm('Sei sicuro di voler approvare questo punto di interesse?');
                        if (!confirmed) return;

                        try {
                          const { error } = await supabase
                            .from('points')
                            .update({
                              da_approvare: 1,
                              created_at: new Date().toISOString()
                            })
                            .eq('id', poi.id);

                          if (error) {
                            console.error('Error approving POI:', error);
                            alert('Errore durante l\'approvazione del POI');
                          } else {
                            // Force re-render to update the marker color
                            setMapKey(Date.now());
                            // Refresh the POI data in the parent component
                            if (onPoiUpdated) {
                              onPoiUpdated();
                            }
                            alert('POI approvato con successo!');
                          }
                        } catch (err) {
                          console.error('Error approving POI:', err);
                          alert('Errore durante l\'approvazione del POI');
                        }
                      }}
                      className="text-sm px-3 py-2 rounded w-full font-medium bg-green-600 text-white hover:bg-green-700 shadow-sm"
                    >
                      ✅ Approva
                    </button>
                  )}

                  {/* Delete and Inattività buttons row - side by side */}
                  <div className="flex gap-2">
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

                            // Ask for confirmation before deleting
                            const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                            if (!confirmed) return;

                            try {
                              // First, delete the photo from Cloudinary if it exists
                              if (poi.photo_url) {
                                try {
                                  await deletePhotoFromCloudinary(poi.photo_url);
                                } catch (photoError) {
                                  console.error('Error deleting photo from Cloudinary:', photoError);
                                  // Continue with POI deletion even if photo deletion fails
                                }
                              }

                              // Then delete the POI from the database
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
                          className="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1"
                        >
                          🗑️ Elimina Punto
                        </button>
                      );
                    })()}

                    {/* Segnala Inattività button - for POIs with ispezionabile === 1 and da_approvare === 1 */}
                    {poi.ispezionabile === 1 && poi.da_approvare === 1 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();

                          // Ask for confirmation before marking as inactive
                          const confirmed = window.confirm('Sei sicuro di voler segnalarlo come inattivo?');
                          if (!confirmed) return;

                          try {
                            // Update the data_inattivita field with today's date
                            const { error } = await supabase
                              .from('points')
                              .update({
                                data_inattivita: new Date().toISOString()
                              })
                              .eq('id', poi.id);

                            if (error) {
                              console.error('Error updating data_inattivita:', error);
                              alert('Errore durante la segnalazione di inattività');
                            } else {
                              // Refresh the POI data in the parent component
                              if (onPoiUpdated) {
                                onPoiUpdated();
                              }
                              alert('Punto segnato come inattivo con successo!');
                            }
                          } catch (err) {
                            console.error('Error updating data_inattivita:', err);
                            alert('Errore durante la segnalazione di inattività');
                          }
                        }}
                        className="text-xs px-2 py-1 rounded font-medium bg-orange-500 text-white hover:bg-orange-600 shadow-sm flex-1"
                      >
                        ⚠️ Segnala Inattività
                      </button>
                    )}
                  </div>
                </div>
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
            <POIFormPopup
              location={newPoiLocation}
              onAddPoi={onAddPoi}
              onCancelAddPoi={onCancelAddPoi}
            />
          </Popup>
        </Marker>
      )}

      <MapClickHandler onMapClick={onMapClick} onAddPoi={onAddPoi} onCancelAddPoi={onCancelAddPoi} />
    </MapContainer>
  );
};

export default MapComponent;
