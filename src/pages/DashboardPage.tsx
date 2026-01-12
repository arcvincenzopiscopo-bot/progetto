import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadPhoto, updatePassword } from '../services/authService';
import { getAddressWithCache } from '../services/geocodingService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import SearchBox from '../components/UI/SearchBox';
import PasswordChangePopup from '../components/Auth/PasswordChangePopup';
import { validatePoi, PointOfInterest } from '../utils/validatePoi';
import { FilterState } from '../types';
import { MapSkeleton } from '../components/SkeletonLoader';

// Lazy load heavy components
const MapComponent = React.lazy(() => import('../components/Map/MapComponent'));
const MapErrorBoundary = React.lazy(() => import('../components/Map/MapErrorBoundary'));
const POIFormPopup = React.lazy(() => import('../components/POI/POIFormPopup'));



const DashboardPage: React.FC = () => {
  const { user, logout } = useCustomAuth();
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
        // Utenti non admin possono vedere tutti i POI già ispezionati (rossi) più i propri POI ispezionabili (verdi)
        // Escludi completamente i POI in attesa di approvazione (ispezionabile=2)
        query = query.or(`ispezionabile.eq.0,and(ispezionabile.eq.1,username.eq.${user.username})`);
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

  const handleLogout = useCallback(async () => {
    logout();
  }, [logout]);

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

      {/* Header di benvenuto */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-800 text-center">
            <span className="font-bold">Benvenuto</span> {user?.username} - {userRole}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-2 py-4">
        {/* Map Section with rounded gray borders */}
        <div className="bg-gray-200 border border-gray-300 rounded-lg overflow-hidden shadow-sm mb-4">
          <div className="h-[66vh] w-full">
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
                  setCreatingNewPoi(false); // Reset creating state when canceling
                }}
                filterShowInspectable={filters.showInspectable}
                filterShowNonInspectable={filters.showNonInspectable}
                filterShowPendingApproval={filters.showPendingApproval}
                filterShowCantiere={filters.showCantiere}
                filterShowAltro={filters.showAltro}
                filterShow2024={filters.show2024}
                filterShow2025={filters.show2025}
                height="66vh"
                workingPoiId={workingPoiId}
                selectedPoiId={selectedPoiId}
                creatingNewPoi={creatingNewPoi}
                />
              </MapErrorBoundary>
            </Suspense>
          </div>
        </div>

        {/* Buttons Section - Centered below map */}
        <div className="flex justify-center gap-4 mb-4">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg border border-indigo-300 hover:bg-indigo-50 font-medium transition-colors inline-flex items-center space-x-2 text-sm"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>

          {/* Center Map Button */}
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
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg border border-indigo-300 hover:bg-indigo-50 font-medium transition-colors inline-flex items-center space-x-2 text-sm"
          >
            <span>📍</span>
            <span>Centra la mappa</span>
          </button>

          {/* Install PWA Button - Only show if installable */}
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

        {/* Search Box Section - Below buttons */}
        <div className="mb-4">
          <SearchBox
            onLocationSelect={handleLocationSelect}
            placeholder="Cerca indirizzo (es: Via Roma 123, Milano)"
            className="max-w-md mx-auto"
          />
        </div>

        {/* Bottom Section - Filters with rounded gray borders */}
        <div className="bg-gray-200 border border-gray-300 rounded-lg p-6 shadow-sm">

          {/* Filters Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 filters-section">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Left Column - Status Filters */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-inspectable"
                    checked={filters.showInspectable}
                    onChange={(e) => setFilters(prev => ({ ...prev, showInspectable: e.target.checked }))}
                    className="h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="filter-inspectable" className="text-sm font-medium text-gray-700">
                    🟢 Ispezionabili
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-non-inspectable"
                    checked={filters.showNonInspectable}
                    onChange={(e) => setFilters(prev => ({ ...prev, showNonInspectable: e.target.checked }))}
                    className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="filter-non-inspectable" className="text-sm font-medium text-gray-700">
                    🔴 Già ispezionati
                  </label>
                </div>
                {/* Hide pending approval filter for non-admin users */}
                {user?.admin !== 0 && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="filter-pending-approval"
                      checked={filters.showPendingApproval}
                      onChange={(e) => setFilters(prev => ({ ...prev, showPendingApproval: e.target.checked }))}
                      className="h-5 w-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="filter-pending-approval" className="text-sm font-medium text-gray-700">
                      🟡 In attesa di eliminazione per cantiere finito
                    </label>
                  </div>
                )}
              </div>

              {/* Right Column - Type and Year Filters */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-cantiere"
                    checked={filters.showCantiere}
                    onChange={(e) => setFilters(prev => ({ ...prev, showCantiere: e.target.checked }))}
                    className="h-5 w-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="filter-cantiere" className="text-sm font-medium text-gray-700">
                    🏗️ Cantiere
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-altro"
                    checked={filters.showAltro}
                    onChange={(e) => setFilters(prev => ({ ...prev, showAltro: e.target.checked }))}
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="filter-altro" className="text-sm font-medium text-gray-700">
                    🔵 Altro
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-2024"
                    checked={filters.show2024}
                    onChange={(e) => setFilters(prev => ({ ...prev, show2024: e.target.checked }))}
                    className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="filter-2024" className="text-sm font-medium text-gray-700">
                    🟣 Anno 2024
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="filter-2025"
                    checked={filters.show2025}
                    onChange={(e) => setFilters(prev => ({ ...prev, show2025: e.target.checked }))}
                    className="h-5 w-5 text-gray-700 border-gray-300 rounded focus:ring-gray-500"
                  />
                  <label htmlFor="filter-2025" className="text-sm font-medium text-gray-700">
                    🟦 Anno 2025
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add POI Modal - appears as overlay when clicking on map */}
      {showAddForm && newPoiLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4">
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
