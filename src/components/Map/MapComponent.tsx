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
  mapCenter?: [number, number] | null;
  mapZoom?: number;
  onPoiUpdated?: (poiPosition?: [number, number], zoomLevel?: number, workingPoiId?: string) => void;
  onPoiSelect?: (poi: PointOfInterest) => void; // Callback when POI is selected
  currentTeam?: string;
  adminLevel?: number;
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
  workingPoiId?: string | null; // ID of POI currently being worked on
  selectedPoiId?: string | null; // ID of POI currently selected
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

// Large icons for POI currently being worked on (double size) - maintaining original colors
const largeDefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const largeGreenIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const largeRedIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const largeYellowIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const largeMagentaIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const largeDarkGreyIcon = L.icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [50, 82], // Double the size
  iconAnchor: [25, 82], // Adjusted anchor point
  popupAnchor: [1, -82], // Adjusted popup anchor
  shadowSize: [82, 82] // Double shadow size
});

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  onPoiDeselect?: () => void; // Callback when clicking on map to deselect POIs
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
}> = ({ onMapClick, onPoiDeselect, newPoiLocation, onAddPoi, onCancelAddPoi }) => {
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

  return null; // Remove the marker from MapClickHandler - it's now handled in MapComponent
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

const MapComponent: React.FC<MapComponentProps> = ({ pois, onMapClick, selectedPoi, initialPosition, mapCenter, mapZoom, onPoiUpdated, onPoiSelect, currentTeam, adminLevel = 0, newPoiLocation, onAddPoi, onCancelAddPoi, filterShowInspectable = true, filterShowNonInspectable = true, filterShowPendingApproval = true, filterShowCantiere = true, filterShowAltro = true, filterShow2024 = false, filterShow2025 = false, height, workingPoiId = null, selectedPoiId = null }) => {
  // Use mapCenter if provided, otherwise use initialPosition, otherwise default to Rome coordinates
  const centerPosition: [number, number] = mapCenter || initialPosition || [41.9028, 12.4964];
  const [mapKey, setMapKey] = useState(Date.now());

  // State for editing historical POI addresses
  const [editingAddress, setEditingAddress] = useState<{ [key: string]: string | undefined }>({});
  const [updatingAddress, setUpdatingAddress] = useState<Set<string>>(new Set());

  // Handle address editing for historical POIs
  const handleAddressEdit = async (poiId: string, newAddress: string, anno: number) => {
    if (!newAddress.trim() || updatingAddress.has(poiId)) return;

    setUpdatingAddress(prev => new Set(prev).add(poiId));

    try {
      // Import searchAddress function for geocoding
      const { searchAddress } = await import('../../services/geocodingService');

      // First, geocode the new address to get coordinates
      const searchResults = await searchAddress(newAddress.trim());

      let updateData: any = { indirizzo: newAddress.trim() };

      // If geocoding was successful, update coordinates too
      if (searchResults && searchResults.length > 0) {
        const bestResult = searchResults[0];
        updateData.latitudine = parseFloat(bestResult.lat);
        updateData.longitudine = parseFloat(bestResult.lon);
      }

      // Determine which table to update based on year
      const tableName = anno === 2024 ? 'points_old_2024' : 'points_old_2025';

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', poiId);

      if (error) {
        console.error('Error updating POI address:', error);
        alert('Errore durante l\'aggiornamento dell\'indirizzo');
        // Revert the local state on error
        setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
      } else {
        console.log('POI address updated successfully');
        // Refresh POI data
        if (onPoiUpdated) {
          onPoiUpdated();
        }
        // Clear editing state
        setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
      }
    } catch (error) {
      console.error('Error updating POI:', error);
      alert('Errore durante l\'aggiornamento del POI');
      // Revert the local state on error
      setEditingAddress(prev => ({ ...prev, [poiId]: undefined }));
    } finally {
      setUpdatingAddress(prev => {
        const newSet = new Set(prev);
        newSet.delete(poiId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    // Force re-render when initialPosition changes
    if (initialPosition) {
      setMapKey(Date.now());
    }
  }, [initialPosition]);

  useEffect(() => {
    // Force re-render when mapCenter or mapZoom changes (for centering on POI actions)
    if (mapCenter || mapZoom) {
      setMapKey(Date.now());
    }
  }, [mapCenter, mapZoom]);

  return (
    <MapContainer
      key={mapKey}
      center={centerPosition}
      zoom={mapZoom || 13}
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
          if (poi.ispezionabile === 2 && !filterShowPendingApproval) return false;
          if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
          if (poi.tipo === 'altro' && !filterShowAltro) return false;
          // Filter by year - historical POIs
          if (poi.anno === 2024 && !filterShow2024) return false;
          if (poi.anno === 2025 && !filterShow2025) return false;
          return true;
        })
        .map((poi) => {
        // Determine which icon to use based on working/selected state first, then year, then status
        // Priority: Working POI -> large colored icon (double size, maintains original color)
        // Then: Selected POI -> large colored icon (double size, maintains original color)
        // Then: Historical POIs (2024, 2025) -> special colored markers
        // Then: ispezionabile = 2 -> yellow marker (pending approval)
        // Then: ispezionabile = 1 -> green marker, = 0 -> red marker
        let markerIcon;
        const isWorkingOrSelected = workingPoiId === poi.id || selectedPoiId === poi.id;

        if (isWorkingOrSelected) {
          // This POI is currently being worked on or selected - use large icon with original color
          if (poi.anno === 2024) {
            markerIcon = largeMagentaIcon; // 🟣 Large magenta for 2024 working/selected POI
          } else if (poi.anno === 2025) {
            markerIcon = largeDarkGreyIcon; // ⚫ Large dark grey for 2025 working/selected POI
          } else if (poi.ispezionabile === 2) {
            markerIcon = largeYellowIcon; // 🟡 Large yellow for pending approval working/selected POI
          } else {
            markerIcon = poi.ispezionabile === 1 ? largeGreenIcon : largeRedIcon; // 🟢 Large green or 🔴 Large red
          }
        } else if (poi.anno === 2024) {
          markerIcon = magentaIcon; // 🟣 Magenta for 2024
        } else if (poi.anno === 2025) {
          markerIcon = darkGreyIcon; // ⚫ Dark grey for 2025
        } else if (poi.ispezionabile === 2) {
          markerIcon = yellowIcon;
        } else {
          markerIcon = poi.ispezionabile === 1 ? greenIcon : redIcon;
        }

        return (
          <Marker
            key={`${poi.id}-${poi.anno || 'current'}-${poi.created_at}`}
            position={[poi.latitudine, poi.longitudine]}
            icon={markerIcon}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation(); // Prevent map click event
                if (onPoiSelect) {
                  onPoiSelect(poi); // Select this POI
                }
              },
            }}
          >
            <Popup maxWidth={400} minWidth={300} className="existing-poi-popup">
              <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {poi.anno === 2024 || poi.anno === 2025 ? 'inserito nel db in data ' :
                     poi.ispezionabile === 1 ? 'Proposto da ispezionare in data ' :
                     poi.ispezionabile === 0 ? 'Ispezionato in data: ' :
                     poi.ispezionabile === 2 ? 'Creato in data: ' : ''}
                    {new Date(poi.created_at).toLocaleString()}
                  </p>
                  {poi.anno ? (
                    // Editable address for historical POIs
                    <div className="mb-1">
                      <label className="block text-xs text-gray-500 mb-1">Indirizzo (modificabile):</label>
                      <input
                        type="text"
                        value={editingAddress[poi.id] !== undefined ? editingAddress[poi.id] : poi.indirizzo || ''}
                        onChange={(e) => setEditingAddress(prev => ({ ...prev, [poi.id]: e.target.value }))}
                        onBlur={(e) => handleAddressEdit(poi.id, e.target.value, poi.anno!)}
                        disabled={updatingAddress.has(poi.id)}
                        className={`w-full px-2 py-1 text-sm border rounded ${
                          updatingAddress.has(poi.id)
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}
                        placeholder="Inserisci indirizzo..."
                      />
                      {updatingAddress.has(poi.id) && (
                        <span className="text-xs text-blue-600 ml-2">🔄 Aggiornando...</span>
                      )}
                    </div>
                  ) : (
                    // Read-only address for current POIs
                    <p className="text-sm text-gray-600 mb-1">Indirizzo: {poi.indirizzo || 'N/D'}</p>
                  )}
                  <p className="text-sm text-gray-600 mb-1">Username: {poi.username || 'N/D'}</p>
                  <p className="text-sm text-gray-600 mb-1">Team: {poi.team || 'N/D'}</p>
                  <p className="text-sm text-gray-600 mb-1">Tipo: {poi.tipo || 'N/D'}</p>
                  {poi.note && <p className="text-sm text-gray-600 mb-1">Note: {poi.note}</p>}
                  {poi.data_inattivita && (
                    <p className="text-sm text-gray-600 mb-1">
                      Inattività segnalata in {new Date(poi.data_inattivita).toLocaleString()}
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
                  {/* Dynamic buttons based on POI type */}
                  <div className="space-y-2">
                    {/* For historical POIs (2024, 2025) - only share button */}
                    {poi.anno ? (
                      <div className="flex gap-2">
                        <button
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
                      </div>
                    ) : (
                      /* For current POIs - full button set */
                      <>
                        {/* First row - Share button and primary actions */}
                        <div className="flex gap-2">
                          {/* Share button - always present */}
                          <button
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

                          {/* Current POIs - admin approve button - REMOVED for all users */}
                          {false && adminLevel >= 1 && poi.ispezionabile === 2 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler approvare questo punto di interesse?');
                                if (!confirmed) return;
                                try {
                                  const { error } = await supabase
                                    .from('points')
                                    .update({ ispezionabile: 1, created_at: new Date().toISOString() })
                                    .eq('id', poi.id);
                                  if (error) {
                                    alert('Errore durante l\'approvazione del POI');
                                  } else {
                                    setMapKey(Date.now());
                                    if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 15);
                                  }
                                } catch (err) {
                                  alert('Errore durante l\'approvazione del POI');
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-green-600 text-white hover:bg-green-700 shadow-sm flex-1"
                            >
                              ✅ Approva
                            </button>
                          )}

                          {/* Current POIs - superadmin delete button for red POIs */}
                          {adminLevel === 2 && poi.ispezionabile === 0 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                                if (!confirmed) return;
                                try {
                                  if (poi.photo_url) {
                                    await deletePhotoFromCloudinary(poi.photo_url).catch(() => {});
                                  }
                                    const { error } = await supabase.from('points').delete().eq('id', poi.id);
                                    if (!error && onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                } catch (err) {
                                  console.error('Error deleting POI:', err);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1"
                            >
                              🗑️ Elimina
                            </button>
                          )}
                        </div>

                        {/* Second row - secondary actions */}
                        <div className="flex gap-2 flex-wrap">
                          {/* Green POIs - Cantiere finito button */}
                          {poi.ispezionabile === 1 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler marcare questo cantiere come finito? Il POI passerà in attesa di approvazione.');
                                if (!confirmed) return;
                                // Set working POI for visual feedback
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
                                    setMapKey(Date.now());
                                    if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                  } else {
                                    alert('Errore nell\'aggiornamento del POI');
                                  }
                                } catch (err) {
                                  console.error('Error updating POI:', err);
                                  alert('Errore nell\'aggiornamento del POI');
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                            >
                              🏗️ Cantiere finito
                            </button>
                          )}

                          {/* Green POIs - Ispezionato button */}
                          {poi.ispezionabile === 1 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler cambiare lo stato di questo punto di interesse?');
                                if (!confirmed) return;
                                // Set working POI for visual feedback
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
                                    setMapKey(Date.now());
                                    if (onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                  }
                                } catch (err) {
                                  console.error('Error toggling ispezionabile:', err);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-green-500 text-white hover:bg-green-600 shadow-sm"
                            >
                              👮‍♂️ Ispezionato
                            </button>
                          )}

                          {/* Green POIs - Segnala inattività button */}
                          {poi.ispezionabile === 1 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler segnalarlo come inattivo?');
                                if (!confirmed) return;
                                // Set working POI for visual feedback
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
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                            >
                              ⚠️ Segnala inattività
                            </button>
                          )}

                          {/* Delete button for green POIs - restricted for admin=0 users */}
                          {poi.ispezionabile === 1 && (() => {
                            // For admin=0: only show delete button if POI was created by current user today
                            if (adminLevel === 0) {
                              const poiDate = new Date(poi.created_at);
                              const today = new Date();
                              const isCreatedToday = poiDate.getDate() === today.getDate() &&
                                                     poiDate.getMonth() === today.getMonth() &&
                                                     poiDate.getFullYear() === today.getFullYear();
                              // Note: username check is not needed here since admin=0 users only see their own green POIs
                              return isCreatedToday;
                            }
                            // For admin>=1: show delete button for all green POIs
                            return true;
                          })() && (
                            <div className="flex justify-center">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                                  if (!confirmed) return;
                                  try {
                                    if (poi.photo_url) {
                                      await deletePhotoFromCloudinary(poi.photo_url).catch(() => {});
                                    }
                                    const { error } = await supabase.from('points').delete().eq('id', poi.id);
                                    if (!error && onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                                  } catch (err) {
                                    console.error('Error deleting POI:', err);
                                  }
                                }}
                                className="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm"
                              >
                                🗑️ Elimina
                              </button>
                            </div>
                          )}

                          {/* Non-admin delete button for yellow POIs created today */}
                          {adminLevel === 0 && poi.ispezionabile === 2 && (() => {
                            const poiDate = new Date(poi.created_at);
                            const today = new Date();
                            return poiDate.getDate() === today.getDate() &&
                                   poiDate.getMonth() === today.getMonth() &&
                                   poiDate.getFullYear() === today.getFullYear();
                          })() && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                                if (!confirmed) return;
                                try {
                                  if (poi.photo_url) {
                                    await deletePhotoFromCloudinary(poi.photo_url).catch(() => {});
                                  }
                                  const { error } = await supabase.from('points').delete().eq('id', poi.id);
                                  if (!error && onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine]);
                                } catch (err) {
                                  console.error('Error deleting POI:', err);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1"
                            >
                              🗑️ Elimina
                            </button>
                          )}

                          {/* Admin and superadmin delete button for yellow POIs */}
                          {adminLevel >= 1 && poi.ispezionabile === 2 && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                                if (!confirmed) return;
                                try {
                                  if (poi.photo_url) {
                                    await deletePhotoFromCloudinary(poi.photo_url).catch(() => {});
                                  }
                                  const { error } = await supabase.from('points').delete().eq('id', poi.id);
                                  if (!error && onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine]);
                                } catch (err) {
                                  console.error('Error deleting POI:', err);
                                }
                              }}
                              className="text-xs px-2 py-1 rounded font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm flex-1"
                            >
                              🗑️ Elimina
                            </button>
                          )}
                        </div>
                      </>
                    )}
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
          icon={largeDefaultIcon} // Use large icon when adding new POI
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
