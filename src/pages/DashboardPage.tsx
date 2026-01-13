import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadPhoto, updatePassword } from '../services/authService';
import { getAddressWithCache } from '../services/geocodingService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import SearchBox from '../components/UI/SearchBox';
import FilterButton from '../components/UI/FilterButton';
import PasswordChangePopup from '../components/Auth/PasswordChangePopup';
import { validatePoi, PointOfInterest } from '../utils/validatePoi';
import { FilterState } from '../types';
import { MapSkeleton } from '../components/SkeletonLoader';

// Lazy load heavy components
const MapComponent = React.lazy(() => import('../components/Map/MapComponent'));
const MapErrorBoundary = React.lazy(() => import('../components/Map/MapErrorBoundary'));
const POIFormPopup = React.lazy(() => import('../components/POI/POIFormPopup'));



const DashboardPage: React.FC = () => {
  const { user } = useCustomAuth();
  const { isInstallable, installPWA } = usePWAInstall();
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoiLocation, setNewPoiLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | undefined>(undefined);
  const [filters, setFilters] = useState<FilterState>({
    showInspectable: true,
    showNonInspectable: true,
    showPendingApproval: true,
    showCantiere: true,
    showAltro: true,
    show2024: false, // Default: non selezionato
    show2025: false, // Default: non selezionato
  });
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null); // Separate state for map centering
  const [mapZoom, setMapZoom] = useState<number>(13); // Separate state for map zoom level
  const [workingPoiId, setWorkingPoiId] = useState<string | null>(null); // Track POI currently being worked on
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null); // Track POI currently selected
  const [creatingNewPoi, setCreatingNewPoi] = useState<boolean>(false); // Track if new POI is being created
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false); // Track if password change popup should be shown

  // Loading states for granular feedback
  const [isLoadingPois, setIsLoadingPois] = useState<boolean>(true); // Loading POI data
  const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false); // Geocoding new POI address
  const [updatingPoiId, setUpdatingPoiId] = useState<string | null>(null); // Track which POI is being updated

  // Update task progress - marking completed steps
  // [x] Estendere geocodingService per ricerca indirizzi
  // [x] Creare componente SearchBox con autocompletamento
  // [x] Integrare SearchBox nella dashboard sopra la mappa
  // [x] Implementare callback per centrare mappa sui risultati

  const fetchPois = useCallback(async () => {
    try {
      setIsLoadingPois(true);

      // Recupera POI dalla tabella principale 'points'
      let query = supabase
        .from('points')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtra i POI in base ai privilegi dell'utente
      if (user?.admin === 0) {
        // Utenti non admin possono vedere tutti i POI già ispezionati (rossi) più tutti i POI ispezionabili (verdi)
        // Escludi completamente i POI in attesa di approvazione (ispezionabile=2)
        query = query.or('ispezionabile.eq.0,ispezionabile.eq.1');
      }
      // Utenti admin possono vedere tutti i POI (nessun filtro aggiuntivo)

      const { data: currentPois, error: currentError } = await query;

      if (currentError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching current POIs:', currentError);
        }
        throw currentError;
      }

      // Recupera POI storici 2024
      const { data: pois2024, error: error2024 } = await supabase
        .from('points_old_2024')
        .select('*')
        .order('created_at', { ascending: false });

      if (error2024) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching 2024 POIs:', error2024);
        }
      }

      // Recupera POI storici 2025
      const { data: pois2025, error: error2025 } = await supabase
        .from('points_old_2025')
        .select('*')
        .order('created_at', { ascending: false });

      if (error2025) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Error fetching 2025 POIs:', error2025);
        }
      }

      // Unisci tutti i POI aggiungendo il campo anno e valida coordinate
      const allPois: PointOfInterest[] = [];



      // POI attuali (anno non definito o null)
      if (currentPois) {
        const validCurrentPois = currentPois
          .map(poi => validatePoi(poi))
          .filter((poi): poi is PointOfInterest => poi !== null);
        allPois.push(...validCurrentPois);
      }

      // POI 2024 - Converti coordinate da stringa a numero e usa anno esistente
      if (pois2024) {
        const adaptedPois2024 = pois2024
          .map(poi => {
            const lat = parseFloat(poi.latitudine);
            const lng = parseFloat(poi.longitudine);

            return {
              ...poi,
              // Converti coordinate da stringa a numero
              latitudine: lat,
              longitudine: lng,
              // Converti anno da stringa a numero
              anno: parseInt(poi.anno) || 2024,
              // Aggiungi campi mancanti con valori di default
              username: poi.username || 'storico-2024',
              team: poi.team || 'archivio',
              ispezionabile: poi.ispezionabile ?? 1, // Default: ispezionabile
              tipo: 'cantiere', // Tutti i POI 2024 sono di tipo cantiere
              note: poi.note || 'POI storico 2024',
              da_approvare: null // POI storici già "approvati"
            };
          })
          .filter(poi => !isNaN(poi.latitudine) && !isNaN(poi.longitudine));

        const validPois2024 = adaptedPois2024
          .map(poi => validatePoi(poi))
          .filter((poi): poi is PointOfInterest => poi !== null);
        allPois.push(...validPois2024);
      }

      // POI 2025 - Converti coordinate da stringa a numero e usa anno esistente
      if (pois2025) {
        const adaptedPois2025 = pois2025
          .map(poi => {
            // Converti coordinate da stringa a numero con validazione aggiuntiva
            let lat, lng;
            if (typeof poi.latitudine === 'string') {
              lat = parseFloat(poi.latitudine);
            } else if (typeof poi.latitudine === 'number') {
              lat = poi.latitudine;
            } else {
              lat = 0;
            }

            if (typeof poi.longitudine === 'string') {
              lng = parseFloat(poi.longitudine);
            } else if (typeof poi.longitudine === 'number') {
              lng = poi.longitudine;
            } else {
              lng = 0;
            }

            return {
              ...poi,
              // Converti coordinate da stringa a numero
              latitudine: lat,
              longitudine: lng,
              // Converti anno da stringa a numero
              anno: parseInt(poi.anno) || 2025,
              // Aggiungi campi mancanti con valori di default
              username: poi.username || 'storico-2025',
              team: poi.team || 'archivio',
              ispezionabile: poi.ispezionabile ?? 1, // Default: ispezionabile
              tipo: 'cantiere', // Tutti i POI 2025 sono di tipo cantiere
              note: poi.note || 'POI storico 2025',
              da_approvare: null // POI storici già "approvati"
            };
          })
          .filter(poi => !isNaN(poi.latitudine) && !isNaN(poi.longitudine) && poi.latitudine !== 0 && poi.longitudine !== 0);

        const validPois2025 = adaptedPois2025
          .map(poi => validatePoi(poi))
          .filter((poi): poi is PointOfInterest => poi !== null);
        allPois.push(...validPois2025);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('POI summary:', {
          current: currentPois?.length || 0,
          year2024: pois2024?.length || 0,
          year2025: pois2025?.length || 0,
          total: allPois.length
        });

        // Debug dettagliato filtri
        console.log('🔍 Debug filtri coordinate:');
        const validCurrent = currentPois ? currentPois.filter(poi => {
          const isValid = validatePoi(poi) !== null;
          if (!isValid) console.log('❌ POI corrente invalido:', poi.id, poi.latitudine, poi.longitudine, 'Type lat:', typeof poi.latitudine, 'Type lng:', typeof poi.longitudine);
          return isValid;
        }).length : 0;

        const valid2024 = pois2024 ? pois2024.filter(poi => {
          const isValid = validatePoi(poi) !== null;
          if (!isValid) console.log('❌ POI 2024 invalido:', poi.id, poi.latitudine, poi.longitudine, 'Type lat:', typeof poi.latitudine, 'Type lng:', typeof poi.longitudine);
          return isValid;
        }).length : 0;

        const valid2025 = pois2025 ? pois2025.filter(poi => {
          const isValid = validatePoi(poi) !== null;
          if (!isValid) console.log('❌ POI 2025 invalido:', poi.id, poi.latitudine, poi.longitudine, 'Type lat:', typeof poi.latitudine, 'Type lng:', typeof poi.longitudine);
          return isValid;
        }).length : 0;

        console.log('✅ POI validi - Correnti:', validCurrent, '2024:', valid2024, '2025:', valid2025);
      }

      setPois(allPois);
      setIsLoadingPois(false);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching POIs:', err);
      }
      setIsLoadingPois(false);
    }
  }, [user]);

  useEffect(() => {
    // Log user info without sensitive data
    if (user) {
      console.log('Dashboard: Component mounted for user:', {
        id: user.id,
        username: user.username,
        team: user.team,
        admin: user.admin
      });
      fetchPois();
    }
  }, [user, fetchPois]);

  useEffect(() => {
    console.log('Dashboard: isInstallable changed:', isInstallable);
  }, [isInstallable]);

  // Check if user needs to change password
  useEffect(() => {
    if (user && user.needsPasswordChange) {
      setShowPasswordChange(true);
    }
  }, [user]);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentPosition([latitude, longitude]);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to default position (Rome) if geolocation fails
          setCurrentPosition(undefined);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      setCurrentPosition(undefined);
    }
  }, []);

  const handleAddPoi = useCallback(async (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => {
    if (!newPoiLocation || !user) return;

    // Set creating state for visual feedback
    setCreatingNewPoi(true);

    // Tutti gli utenti possono inserire POI direttamente ispezionabili
    // Il valore di ispezionabile viene mantenuto come selezionato nel form
    let finalIspezionabile = ispezionabile;

    // Se l'indirizzo è solo coordinate, prova a ottenere l'indirizzo topografico
    let finalAddress = indirizzo;
    if (indirizzo.startsWith('Lat:') || indirizzo.startsWith('Coordinate:')) {
      try {
        const result = await getAddressWithCache(newPoiLocation.lat, newPoiLocation.lng);
        if (result.success && result.address) {
          finalAddress = result.address;
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error getting address for POI:', error);
        }
        // Keep the original address if geocoding fails
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('Adding POI with data:', {
        indirizzo: finalAddress,
        ispezionabile: finalIspezionabile,
        tipo,
        note,
        photo: photo ? `${photo.name} (${(photo.size / 1024 / 1024).toFixed(2)}MB)` : 'Nessuna foto',
        lat: newPoiLocation.lat,
        lng: newPoiLocation.lng,
        user_admin: user.admin
      });
    }

    try {
      const poiData: any = {
        indirizzo: finalAddress,
        username: user.username,
        team: user.team || "", // Usa il team dall'utente loggato
        ispezionabile: finalIspezionabile,
        tipo: tipo,
        note: note || "",
        latitudine: newPoiLocation.lat,
        longitudine: newPoiLocation.lng,
      };

      // Crea il POI nel database
      const { data, error } = await supabase
        .from('points')
        .insert([poiData])
        .select();

      if (process.env.NODE_ENV === 'development') {
        console.log('Supabase response:', { data, error });
      }

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        const poiId = data[0].id;
        let photoUrl: string | undefined;

        // Se è presente una foto, comprimila e caricala
        if (photo) {
          try {
            if (process.env.NODE_ENV === 'development') {
              console.log('Comprimendo e caricando foto...');
            }
            photoUrl = await uploadPhoto(photo, poiId);
            if (process.env.NODE_ENV === 'development') {
              console.log('Foto caricata:', photoUrl);
            }

            // Aggiorna il POI con l'URL della foto
            const { error: updateError } = await supabase
              .from('points')
              .update({ photo_url: photoUrl })
              .eq('id', poiId);

            if (updateError) {
              if (process.env.NODE_ENV === 'development') {
                console.error('Errore nell\'aggiornamento dell\'URL foto:', updateError);
              }
              // Non bloccare la creazione del POI per errori nell'upload foto
            } else {
              // Aggiorna il POI nella lista locale con l'URL della foto
              data[0].photo_url = photoUrl;
            }
          } catch (photoError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Errore nell\'upload della foto:', photoError);
            }
            alert('POI creato ma errore nel caricamento della foto. Puoi riprovare modificando il POI.');
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('POI added successfully:', data[0]);
        }
        const newPoi = data[0];
        setPois(prevPois => [...prevPois, newPoi]);
        // Automatically select the newly created POI
        setSelectedPoiId(newPoi.id);
        setShowAddForm(false);
        setNewPoiLocation(null);
        setCreatingNewPoi(false); // Reset creating state on success
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error adding POI:', err);
      }
      alert('Errore nella creazione del POI. Riprova.');
      setCreatingNewPoi(false); // Reset creating state on error
    }
  }, [newPoiLocation, user, fetchPois]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    // Reset any working POI when clicking on map to add new POI
    setWorkingPoiId(null);
    setNewPoiLocation({ lat, lng });
    setShowAddForm(true);
  }, []);

  // Function to refresh POI data and optionally center on a POI with specified zoom
  const refreshPois = useCallback((poiPosition?: [number, number], zoomLevel: number = 16, workingPoiIdParam?: string | null) => {
    fetchPois();
    // Set working POI if provided (including explicit null), otherwise keep current value
    if (workingPoiIdParam !== undefined) {
      setWorkingPoiId(workingPoiIdParam);
    }
    if (poiPosition) {
      // Center map on POI with specified zoom without moving user's location marker
      setMapCenter(poiPosition);
      setMapZoom(zoomLevel);
    }
  }, [fetchPois]);



  // Handle location selection from search - creates new POI at searched location
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    console.log('Location selected from search:', lat, lng);
    // Reset any working POI when searching for new location
    setWorkingPoiId(null);
    setSelectedPoiId(null); // Also reset selected POI
    // Center map on searched location with zoom
    refreshPois([lat, lng]);
    setNewPoiLocation({ lat, lng });
    setShowAddForm(true);
  }, [refreshPois]);

  // Handle POI selection/deselection
  const handlePoiSelect = useCallback((poi: PointOfInterest | null) => {
    if (poi) {
      // Select POI - make it large
      setSelectedPoiId(poi.id);
      // Reset working POI when selecting a different POI
      setWorkingPoiId(null);
    } else {
      // Deselect POI - make all normal
      setSelectedPoiId(null);
    }
  }, []);

  // Handle password change
  const handlePasswordChange = useCallback(async (newPassword: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await updatePassword(user.id, newPassword);
      if (success) {
        // Update user context to remove needsPasswordChange flag
        // Note: This will be handled by the context, but we can refresh the page or update session
        console.log('Password changed successfully');
        // The popup will close automatically due to the success return
      }
      return success;
    } catch (error) {
      console.error('Error changing password:', error);
      return false;
    }
  }, [user]);

  // Memoized user role calculation - only recalculates when user.admin changes
  const userRole = useMemo(() => {
    const adminLevel = user?.admin || 0;
    switch (adminLevel) {
      case 0:
        return 'utente ispettore';
      case 1:
        return 'utente responsabile di team';
      case 2:
        return 'utente superadmin';
      default:
        return 'utente';
    }
  }, [user?.admin]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-none mx-auto px-0 py-4">
        {/* Map Section with filters, search, and controls - now takes more space */}
        <div className="bg-gray-200 border border-gray-300 rounded-lg overflow-hidden shadow-sm relative">
          {/* Map Container - responsive height */}
          <div className="h-[90vh] sm:h-[90vh] w-full relative map-container-mobile">
            {/* Search Box - Desktop: Top Center, Mobile: Top Left */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4 z-[1000] search-mobile sm:left-4 sm:transform-none sm:max-w-xs">
              <SearchBox
                onLocationSelect={handleLocationSelect}
                placeholder="Cerca indirizzo..."
                className="w-full"
              />
            </div>

            {/* Filters Panel - Desktop: Above Center Button, Mobile: Bottom Left */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-transparent border border-gray-200 rounded-lg p-3 shadow-lg z-[400] filter-panel-mobile sm:bottom-4 sm:left-4 sm:transform-none sm:p-2">
              <div className="space-y-2">
                {/* First Row: Cantiere, Altro, 2024, 2025 */}
                <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-1">
                  <FilterButton
                    label="Cantiere"
                    emoji="🏗️"
                    active={filters.showCantiere}
                    onClick={() => setFilters(prev => ({ ...prev, showCantiere: !prev.showCantiere }))}
                    colorClass="bg-orange-500 hover:bg-orange-600"
                  />
                  <FilterButton
                    label="Altro"
                    emoji="📍"
                    active={filters.showAltro}
                    onClick={() => setFilters(prev => ({ ...prev, showAltro: !prev.showAltro }))}
                    colorClass="bg-blue-500 hover:bg-blue-600"
                  />
                  <FilterButton
                    label="2024"
                    emoji="🟣"
                    active={filters.show2024}
                    onClick={() => setFilters(prev => ({ ...prev, show2024: !prev.show2024 }))}
                    colorClass="bg-purple-500 hover:bg-purple-600"
                  />
                  <FilterButton
                    label="2025"
                    emoji="🟦"
                    active={filters.show2025}
                    onClick={() => setFilters(prev => ({ ...prev, show2025: !prev.show2025 }))}
                    colorClass="bg-gray-600 hover:bg-gray-700"
                  />
                </div>

                {/* Second Row: Ispezionabili, Già ispezionati, In attesa di approvazione */}
                <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-1">
                  <FilterButton
                    label="Ispezionabili"
                    emoji="🟢"
                    active={filters.showInspectable}
                    onClick={() => setFilters(prev => ({ ...prev, showInspectable: !prev.showInspectable }))}
                    colorClass="bg-green-500 hover:bg-green-600"
                  />
                  <FilterButton
                    label="Già ispezionati"
                    emoji="🔴"
                    active={filters.showNonInspectable}
                    onClick={() => setFilters(prev => ({ ...prev, showNonInspectable: !prev.showNonInspectable }))}
                    colorClass="bg-red-500 hover:bg-red-600"
                  />
                  {/* Show pending approval filter only for admin users */}
                  {user?.admin !== 0 && (
                    <FilterButton
                      label="In attesa"
                      emoji="🟡"
                      active={filters.showPendingApproval}
                      onClick={() => setFilters(prev => ({ ...prev, showPendingApproval: !prev.showPendingApproval }))}
                      colorClass="bg-yellow-500 hover:bg-yellow-600"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Center Map Button - Desktop: Bottom Center, Mobile: Bottom Right */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] sm:right-4 sm:left-auto sm:transform-none">
              <button
                onClick={() => {
                  if (currentPosition) {
                    setCurrentPosition([...currentPosition]);
                  } else {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const { latitude, longitude } = position.coords;
                          setCurrentPosition([latitude, longitude]);
                        },
                        (error) => {
                          console.error('Error getting location:', error);
                          alert('Impossibile ottenere la posizione corrente');
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                    } else {
                      alert('La geolocalizzazione non è supportata dal browser');
                    }
                  }
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg border border-red-700 hover:bg-red-700 font-medium transition-colors inline-flex items-center space-x-2 text-sm shadow-lg center-map-button"
              >
                <span>📍</span>
                <span className="hidden sm:inline">Centra la mappa</span>
              </button>
            </div>

            <Suspense fallback={<MapSkeleton />}>
              <MapErrorBoundary>
                <MapComponent
                  pois={pois}
                  onMapClick={handleMapClick}
                  initialPosition={currentPosition}
                  mapCenter={mapCenter}
                  mapZoom={mapZoom}
                  onPoiUpdated={refreshPois}
                  onPoiSelect={handlePoiSelect}
                  currentTeam={user?.team}
                  adminLevel={user?.admin || 0}
                  currentUsername={user?.username}
                  newPoiLocation={showAddForm ? newPoiLocation : null}
                  onAddPoi={handleAddPoi}
                  onCancelAddPoi={() => {
                    setShowAddForm(false);
                    setCreatingNewPoi(false);
                  }}
                  filterShowInspectable={filters.showInspectable}
                  filterShowNonInspectable={filters.showNonInspectable}
                  filterShowPendingApproval={filters.showPendingApproval}
                  filterShowCantiere={filters.showCantiere}
                  filterShowAltro={filters.showAltro}
                  filterShow2024={filters.show2024}
                  filterShow2025={filters.show2025}
                  height="90vh"
                  workingPoiId={workingPoiId}
                  selectedPoiId={selectedPoiId}
                  creatingNewPoi={creatingNewPoi}
                />
              </MapErrorBoundary>
            </Suspense>
          </div>
        </div>

        {/* Install PWA Button - Centered below map */}
        <div className="flex justify-center mt-4">
          {isInstallable && (
            <button
              onClick={installPWA}
              className="bg-green-600 text-white px-4 py-2 rounded-lg border border-green-700 hover:bg-green-700 font-medium transition-colors inline-flex items-center space-x-2 text-sm"
            >
              <span>📱</span>
              <span>Installa App</span>
            </button>
          )}
        </div>
      </div>

      {/* Add POI Modal - appears as overlay when clicking on map */}
      {showAddForm && newPoiLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] modal-overlay-mobile">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4 modal-content-mobile">
            <Suspense fallback={<div className="text-center py-4">Caricamento...</div>}>
              <POIFormPopup
                location={newPoiLocation}
                onAddPoi={handleAddPoi}
                onCancelAddPoi={() => {
                  setShowAddForm(false);
                  setCreatingNewPoi(false);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Password Change Popup */}
      <PasswordChangePopup
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        onPasswordChange={handlePasswordChange}
      />
    </div>
  );
};

export default DashboardPage;
