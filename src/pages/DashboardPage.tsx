import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import { uploadPhoto, updatePassword } from '../services/authService';
import { getAddressWithCache } from '../services/geocodingService';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useGpsHeading } from '../hooks/useGpsHeading';
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
  const { heading } = useGpsHeading(); // GPS heading for map rotation
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
    showToday: false, // Default: non selezionato
  });
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null); // Separate state for map centering
  const [mapZoom, setMapZoom] = useState<number>(13); // Separate state for map zoom level
  const [mapKey, setMapKey] = useState<number>(0); // Force map re-render when needed
  const [workingPoiId, setWorkingPoiId] = useState<string | null>(null); // Track POI currently being worked on
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null); // Track POI currently selected
  const [selectedPoi, setSelectedPoi] = useState<PointOfInterest | null>(null); // Track selected POI data
  const [creatingNewPoi, setCreatingNewPoi] = useState<boolean>(false); // Track if new POI is being created
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false); // Track if password change popup should be shown

  // Loading states for granular feedback
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingPois, setIsLoadingPois] = useState<boolean>(true); // Loading POI data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false); // Geocoding new POI address
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      // Escludi sempre i POI eliminati (soft deleted)
      query = query.neq('ispezionabile', 4);

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
    // Monitor user's current location continuously (like GPS navigators)
    // IMPORTANT: This only uses native browser GPS - NO external API calls
    // OPTIMIZATION: GPS is stopped when app is in background to save battery
    let watchId: number | null = null;
    let lastUpdateTime = 0;
    const MIN_UPDATE_INTERVAL = 2500; // Minimum 2.5 seconds between updates

    // Helper function to start GPS monitoring
    const startGpsMonitoring = () => {
      if (navigator.geolocation && watchId === null) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const newPosition: [number, number] = [latitude, longitude];
            const currentTime = Date.now();

            // Throttle updates to prevent excessive API calls
            if (currentTime - lastUpdateTime < MIN_UPDATE_INTERVAL) {
              return; // Skip this update
            }

            // Update position only if it's significantly different or first time
            setCurrentPosition((prevPosition) => {
              if (!prevPosition) {
                console.log('GPS: Initial position set:', newPosition, 'Accuracy:', accuracy, 'meters');
                lastUpdateTime = currentTime;
                return newPosition;
              }

              // Calculate distance between old and new position
              const distance = Math.sqrt(
                Math.pow((newPosition[0] - prevPosition[0]) * 111320, 2) + // 111320 meters per degree latitude
                Math.pow((newPosition[1] - prevPosition[1]) * 111320 * Math.cos(newPosition[0] * Math.PI / 180), 2) // Adjust for longitude
              );

              // Only update if moved more than 5 meters (accuracy check removed to avoid complexity)
              if (distance > 5) {
                console.log('GPS: Position updated:', newPosition, 'Distance moved:', Math.round(distance), 'm, Accuracy:', accuracy, 'm, Time since last:', Math.round((currentTime - lastUpdateTime) / 1000), 's');
                lastUpdateTime = currentTime;
                return newPosition;
              }

              return prevPosition;
            });
          },
          (error) => {
            console.error('GPS Error:', error.message);
            if (error.code === 1) {
              console.warn('GPS: User denied location access');
            } else if (error.code === 2) {
              console.warn('GPS: Position unavailable');
            } else if (error.code === 3) {
              console.warn('GPS: Position request timeout');
            }
            // Don't set position to undefined to avoid losing existing position
          },
          {
            enableHighAccuracy: true,
            timeout: 20000, // Increased timeout to reduce failed requests
            maximumAge: 60000 // Allow cached positions up to 1 minute old
          }
        );

        console.log('GPS: Started watching position with ID:', watchId, '- Battery optimized');
      }
    };

    // Helper function to stop GPS monitoring
    const stopGpsMonitoring = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        console.log('GPS: Stopped watching position with ID:', watchId, '- Battery saved');
        watchId = null;
      }
    };

    // Handle page visibility changes to save battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden (app in background) - stop GPS to save battery
        console.log('GPS: Page hidden - stopping GPS monitoring to save battery');
        stopGpsMonitoring();
      } else {
        // Page is visible again - restart GPS monitoring
        console.log('GPS: Page visible - restarting GPS monitoring');
        startGpsMonitoring();
      }
    };

    // Start GPS monitoring initially if page is visible
    if (!document.hidden) {
      startGpsMonitoring();
    }

    // Add visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function to stop watching position and remove listeners when component unmounts
    return () => {
      stopGpsMonitoring();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      console.log('GPS: Component unmounted - cleanup complete');
    };
  }, []);

  const handleAddPoi = useCallback(async (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => {
    if (!newPoiLocation || !user) return;

    // Check for existing ACTIVE POI with same coordinates (exclude soft deleted POIs)
    const { data: existingPois, error: checkError } = await supabase
      .from('points')
      .select('id')
      .eq('latitudine', newPoiLocation.lat)
      .eq('longitudine', newPoiLocation.lng)
      .neq('ispezionabile', 4); // Exclude soft deleted POIs from duplicate check

    if (checkError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking for duplicate POI:', checkError);
      }
      alert('Errore nel controllo dei duplicati. Riprova.');
      return;
    }

    if (existingPois && existingPois.length > 0) {
      alert('Esiste già un POI attivo con queste coordinate. Non è possibile inserire duplicati.');
      return;
    }

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
  }, [newPoiLocation, user]);

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
      // Select POI - make it large and center map on it
      setSelectedPoiId(poi.id);
      setSelectedPoi(poi);
      // Reset working POI when selecting a different POI
      setWorkingPoiId(null);
      // Center map on selected POI with zoom 14 (better usability than 16)
      refreshPois([poi.latitudine, poi.longitudine], 14);
    } else {
      // Deselect POI - make all normal
      setSelectedPoiId(null);
      setSelectedPoi(null);
    }
  }, [refreshPois]);

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
  const userRole = useMemo(() => { // eslint-disable-line @typescript-eslint/no-unused-vars
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
      {/* Map Container - Full Height */}
      <div className="relative" style={{ height: '100vh' }}>
        {/* Search Box - Positioned on map, 1.5cm from top, narrower */}
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-full max-w-xs px-0 z-[1000]">
          <SearchBox
            onLocationSelect={handleLocationSelect}
            placeholder="Cerca indirizzo..."
            className="w-full"
          />
        </div>

        <Suspense fallback={<MapSkeleton />}>
          <MapErrorBoundary>
            <MapComponent
              key={mapKey}
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
              filterShowToday={filters.showToday}
              height="100%"
              workingPoiId={workingPoiId}
              selectedPoiId={selectedPoiId}
              creatingNewPoi={creatingNewPoi}
              enableRotation={true} // Enable GPS-based map rotation
              heading={heading} // GPS heading for map rotation
            />
          </MapErrorBoundary>
        </Suspense>

        {/* Filter Buttons - Centered below search box, arranged in two rows */}
        {/* Same filters for all user types to maintain consistent layout */}
        <div className="absolute top-[5rem] left-1/2 transform -translate-x-1/2 z-[500] flex flex-col gap-[0.19cm] max-w-2xl">
          <div className="flex gap-[0.19cm]">
            <div className="w-24">
              <FilterButton
                label="Cantiere"
                emoji="🏗️"
                active={filters.showCantiere}
                onClick={() => setFilters(prev => ({ ...prev, showCantiere: !prev.showCantiere }))}
                colorClass="bg-orange-500 hover:bg-orange-600"
              />
            </div>
            <div className="w-24">
              <FilterButton
                label="Altro"
                emoji="📍"
                active={filters.showAltro}
                onClick={() => setFilters(prev => ({ ...prev, showAltro: !prev.showAltro }))}
                colorClass="bg-blue-500 hover:bg-blue-600"
              />
            </div>
            <div className="w-24">
              <FilterButton
                label="2024"
                emoji="🟣"
                active={filters.show2024}
                onClick={() => setFilters(prev => ({ ...prev, show2024: !prev.show2024 }))}
                colorClass="bg-purple-500 hover:bg-purple-600"
              />
            </div>
            <div className="w-24">
              <FilterButton
                label="2025"
                emoji="🟦"
                active={filters.show2025}
                onClick={() => setFilters(prev => ({ ...prev, show2025: !prev.show2025 }))}
                colorClass="bg-gray-600 hover:bg-gray-700"
              />
            </div>
          </div>
          <div className="flex gap-[0.19cm] justify-center">
            <div className="w-24">
              <FilterButton
                label="Ispez.li"
                emoji="🟢"
                active={filters.showInspectable}
                onClick={() => setFilters(prev => ({ ...prev, showInspectable: !prev.showInspectable }))}
                colorClass="bg-green-500 hover:bg-green-600"
              />
            </div>
            <div className="w-24">
              <FilterButton
                label="Ispez.ti"
                emoji="🔴"
                active={filters.showNonInspectable}
                onClick={() => setFilters(prev => ({ ...prev, showNonInspectable: !prev.showNonInspectable }))}
                colorClass="bg-red-500 hover:bg-red-600"
              />
            </div>
            {/* Show pending approval filter for all users, but disable for admin=0 */}
            <div className="w-24">
              <FilterButton
                label="pending"
                emoji="🟡"
                active={user && user.admin !== undefined && user.admin >= 1 ? filters.showPendingApproval : false}
                onClick={() => {
                  if (user && user.admin !== undefined && user.admin >= 1) {
                    setFilters(prev => ({ ...prev, showPendingApproval: !prev.showPendingApproval }));
                  }
                }}
                colorClass={user && user.admin !== undefined && user.admin >= 1 ? "bg-yellow-500 hover:bg-yellow-600" : "bg-gray-400 cursor-not-allowed"}
              />
            </div>
            {/* Show today filter for admin=1 and admin=2 */}
            <div className="w-24">
              <FilterButton
                label="Oggi"
                emoji="📅"
                active={user && user.admin !== undefined && user.admin >= 1 ? filters.showToday : false}
                onClick={() => {
                  if (user && user.admin !== undefined && user.admin >= 1) {
                    setFilters(prev => ({ ...prev, showToday: !prev.showToday }));
                  }
                }}
                colorClass={user && user.admin !== undefined && user.admin >= 1 ? "bg-teal-500 hover:bg-teal-600" : "bg-gray-400 cursor-not-allowed"}
              />
            </div>
          </div>
        </div>



        {/* Center Map Button - 2cm higher, Bottom center */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000]">
          <button
            onClick={() => {
              if (currentPosition) {
                // Center map on user's current position and force re-render
                setMapCenter(currentPosition);
                setMapZoom(13);
                setMapKey(prev => prev + 1); // Force map re-render
              } else {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      setCurrentPosition([latitude, longitude]);
                      // Center map on the newly obtained position and force re-render
                      setMapCenter([latitude, longitude]);
                      setMapZoom(13);
                      setMapKey(prev => prev + 1); // Force map re-render
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
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg border border-red-700 hover:bg-red-700 font-medium transition-colors inline-flex items-center space-x-2 shadow-lg center-map-button"
          >
            <span>📍</span>
            <span>Centra la mappa</span>
          </button>
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

      {/* Add POI Modal - appears as overlay when clicking on map */}
      {showAddForm && newPoiLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000] modal-overlay-mobile">
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

      {/* Existing POI Modal - appears as overlay when selecting existing POI */}
      {selectedPoi && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[3000] modal-overlay-mobile">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-4 modal-content-mobile">
            <div className="border-2 border-indigo-600 rounded-lg p-3 bg-white poi-form-mobile">
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">
                  {selectedPoi.anno === 2024 || selectedPoi.anno === 2025 ? 'inserito nel db in data ' :
                   selectedPoi.ispezionabile === 1 ? 'Proposto da ispezionare in data ' :
                   selectedPoi.ispezionabile === 0 ? 'Ispezionato in data: ' :
                   selectedPoi.ispezionabile === 2 ? 'Creato in data: ' : ''}
                  {new Date(selectedPoi.created_at).toLocaleString()}
                </p>

                {/* Editable address */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Indirizzo (modificabile):</label>
                  <input
                    type="text"
                    defaultValue={selectedPoi.indirizzo?.slice(0, 20) || ''}
                    autoFocus={false}
                    tabIndex={-1}
                    onChange={(e) => {
                      // Update local state for immediate UI feedback
                      setSelectedPoi(prev => prev ? { ...prev, indirizzo: e.target.value } : null);
                    }}
                    onBlur={async (e) => {
                      // Save to database when focus is lost
                      const newAddress = e.target.value;
                      if (!newAddress.trim() || !selectedPoi) return;

                      console.log('🔄 Starting address edit for POI:', selectedPoi.id, 'New address:', newAddress.trim());
                      setUpdatingPoiId(selectedPoi.id);

                      try {
                        const { searchAddress } = await import('../services/geocodingService');
                        console.log('🔍 Calling geocoding service...');
                        const searchResults = await searchAddress(newAddress.trim());

                        console.log('📍 Geocoding results:', searchResults);

                        let updateData: any = { indirizzo: newAddress.trim() };

                        if (searchResults && searchResults.length > 0) {
                          const bestResult = searchResults[0];
                          const newLat = parseFloat(bestResult.lat);
                          const newLng = parseFloat(bestResult.lon);

                          console.log('📌 Updating coordinates - Old:', selectedPoi.latitudine, selectedPoi.longitudine, 'New:', { lat: newLat, lng: newLng });
                          updateData.latitudine = newLat;
                          updateData.longitudine = newLng;
                        } else {
                          console.warn('⚠️ No geocoding results found for address:', newAddress.trim());
                        }

                        console.log('💾 Update data:', updateData);

                        const tableName = selectedPoi.anno ? (selectedPoi.anno === 2024 ? 'points_old_2024' : 'points_old_2025') : 'points';
                        console.log('🗄️ Updating table:', tableName, 'for POI ID:', selectedPoi.id);

                        const { data, error } = await supabase
                          .from(tableName)
                          .update(updateData)
                          .eq('id', selectedPoi.id)
                          .select();

                        console.log('🗃️ Database update result:', { data, error });

                        if (error) {
                          console.error('❌ Error updating POI address:', error);
                          alert('Errore durante l\'aggiornamento dell\'indirizzo');
                          // Revert local change
                          setSelectedPoi(prev => prev ? { ...prev, indirizzo: selectedPoi.indirizzo } : null);
                        } else {
                          console.log('✅ POI address updated successfully:', data);
                          if (data && data[0]) {
                            // Update local POI data
                            setSelectedPoi(data[0]);
                            // Update in the pois array
                            setPois(prevPois => prevPois.map(poi => poi.id === selectedPoi.id ? data[0] : poi));
                          }
                          refreshPois();
                        }
                      } catch (error) {
                        console.error('💥 Error updating POI:', error);
                        alert('Errore durante l\'aggiornamento del POI');
                        // Revert local change
                        setSelectedPoi(prev => prev ? { ...prev, indirizzo: selectedPoi.indirizzo } : null);
                      } finally {
                        setUpdatingPoiId(null);
                      }
                    }}
                    disabled={updatingPoiId === selectedPoi.id}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="Inserisci indirizzo..."
                  />
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>Username: {selectedPoi.username || 'N/D'}</p>
                  <p>Team: {selectedPoi.team || 'N/D'}</p>
                  <p>Tipo: {selectedPoi.tipo || 'N/D'}</p>
                  {selectedPoi.note && <p>Note: {selectedPoi.note}</p>}
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
                          const shareText = `${selectedPoi.latitudine}, ${selectedPoi.longitudine}`;
                          if (navigator.share) {
                            navigator.share({
                              title: `Punto di Interesse - ${selectedPoi.indirizzo}`,
                              text: `Coordinate: ${shareText}`,
                              url: `https://www.google.com/maps/search/?api=1&query=${selectedPoi.latitudine},${selectedPoi.longitudine}`
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
                      if (user && user.admin !== undefined && user.admin >= 1) {
                        canDelete = true;
                      }
                      // Admin level 0 can delete green and red POIs if created by them today
                      else if (user && user.admin === 0 && (selectedPoi.ispezionabile === 1 || selectedPoi.ispezionabile === 0)) {
                        const poiDate = new Date(selectedPoi.created_at);
                        const today = new Date();
                        const isCreatedToday = poiDate.getDate() === today.getDate() &&
                                               poiDate.getMonth() === today.getMonth() &&
                                               poiDate.getFullYear() === today.getFullYear();
                        if (isCreatedToday && selectedPoi.username === user.username) canDelete = true;
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
                              if (selectedPoi.anno) {
                                tableName = selectedPoi.anno === 2024 ? 'points_old_2024' : 'points_old_2025';
                              }

                              // Soft delete: update ispezionabile to 4 and set deletion metadata
                              const { error } = await supabase
                                .from(tableName)
                                .update({
                                  ispezionabile: 4,
                                  eliminatore: user?.username,
                                  data_eliminazione: new Date().toISOString()
                                })
                                .eq('id', selectedPoi.id);

                              if (!error) {
                                refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14);
                                // Close modal and deselect POI
                                setSelectedPoiId(null);
                                setSelectedPoi(null);
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
                      const canMarkFinished = !selectedPoi.anno && selectedPoi.ispezionabile === 1 && selectedPoi.tipo === 'cantiere' && user && user.admin !== undefined && user.admin >= 0;
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
                            refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14, selectedPoi.id);
                            try {
                              const { error } = await supabase
                                .from('points')
                                .update({
                                  ispezionabile: 2,
                                  created_at: new Date().toISOString(),
                                  team: user?.team || selectedPoi.team
                                })
                                .eq('id', selectedPoi.id);
                              if (!error) {
                                // Update local state
                                setSelectedPoi(prev => prev ? { ...prev, ispezionabile: 2, created_at: new Date().toISOString() } : null);
                                setPois(prevPois => prevPois.map(poi => poi.id === selectedPoi.id ? { ...poi, ispezionabile: 2, created_at: new Date().toISOString() } : poi));
                                refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14);
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
                      const canMarkInspected = !selectedPoi.anno && selectedPoi.ispezionabile === 1 && user && user.admin !== undefined && user.admin >= 0;
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
                            refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14, selectedPoi.id);
                            try {
                              const { error } = await supabase
                                .from('points')
                                .update({
                                  ispezionabile: 0,
                                  created_at: new Date().toISOString(),
                                  team: user?.team || selectedPoi.team
                                })
                                .eq('id', selectedPoi.id);
                              if (!error) {
                                refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14);
                                // Close modal and deselect POI
                                setSelectedPoiId(null);
                                setSelectedPoi(null);
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
                      const canReportInactive = !selectedPoi.anno && selectedPoi.ispezionabile === 1 && selectedPoi.tipo === 'cantiere' && user && user.admin !== undefined && user.admin >= 0;
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
                            refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14, selectedPoi.id);
                            try {
                              const { error } = await supabase
                                .from('points')
                                .update({ data_inattivita: new Date().toISOString() })
                                .eq('id', selectedPoi.id);
                              if (error) {
                                alert('Errore durante la segnalazione di inattività');
                              } else {
                                // Update local state
                                setSelectedPoi(prev => prev ? { ...prev, data_inattivita: new Date().toISOString() } : null);
                                setPois(prevPois => prevPois.map(poi => poi.id === selectedPoi.id ? { ...poi, data_inattivita: new Date().toISOString() } : poi));
                                refreshPois([selectedPoi.latitudine, selectedPoi.longitudine], 14);
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
                              setSelectedPoiId(null);
                              setSelectedPoi(null);
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
