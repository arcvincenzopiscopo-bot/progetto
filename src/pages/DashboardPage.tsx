import React, { useState, useEffect } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import { compressImage, uploadPhoto } from '../services/authService';
import MapComponent from '../components/Map/MapComponent';

interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: boolean;
  tipo: string;
  note?: string;
  latitudine: number;
  longitudine: number;
  da_approvare?: number;
  photo_url?: string;
  created_at: string;
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useCustomAuth();
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoiLocation, setNewPoiLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | undefined>(undefined);
  const [filterShowInspectable, setFilterShowInspectable] = useState(true);
  const [filterShowNonInspectable, setFilterShowNonInspectable] = useState(true);
  const [filterShowPendingApproval, setFilterShowPendingApproval] = useState(true);
  const [filterShowCantiere, setFilterShowCantiere] = useState(true);
  const [filterShowAltro, setFilterShowAltro] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPois();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log('Position obtained:', latitude, longitude);
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

  console.log('Current position:', currentPosition);

  const fetchPois = async () => {
    try {
      let query = supabase
        .from('points')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtra i POI in base ai privilegi dell'utente
      if (user?.admin === 0) {
        // Utenti non admin possono vedere tutti i propri POI (inclusi quelli con da_approvare = 2)
        query = query.eq('username', user.username);
      }
      // Utenti admin possono vedere tutti i POI (nessun filtro aggiuntivo)

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setPois(data || []);
    } catch (err) {
      console.error('Error fetching POIs:', err);
    }
  };

  const handleAddPoi = async (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => {
    if (!newPoiLocation || !user) return;

    // Determina il valore di da_approvare basato sui privilegi dell'utente
    // Utenti admin (admin = 1) possono inserire POI senza approvazione (da_approvare = null o 0)
    // Utenti non admin (admin = 0) devono avere i POI approvati (da_approvare = 2)
    const daApprovare = user.admin === 0 ? 2 : null;

    console.log('Adding POI with data:', {
      indirizzo,
      ispezionabile,
      tipo,
      note,
      da_approvare: daApprovare,
      photo: photo ? `${photo.name} (${(photo.size / 1024 / 1024).toFixed(2)}MB)` : 'Nessuna foto',
      lat: newPoiLocation.lat,
      lng: newPoiLocation.lng,
      user_admin: user.admin
    });

    try {
      const poiData: any = {
        indirizzo: "vuoto",
        username: user.username,
        team: user.team || "", // Usa il team dall'utente loggato
        ispezionabile: ispezionabile,
        tipo: tipo,
        note: note || "",
        latitudine: newPoiLocation.lat,
        longitudine: newPoiLocation.lng,
      };

      // Aggiungi il campo da_approvare solo se necessario
      if (daApprovare !== null) {
        poiData.da_approvare = daApprovare;
      }

      // Crea il POI nel database
      const { data, error } = await supabase
        .from('points')
        .insert([poiData])
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        throw error;
      }

      if (data && data[0]) {
        const poiId = data[0].id;
        let photoUrl: string | undefined;

        // Se è presente una foto, comprimila e caricala
        if (photo) {
          try {
            console.log('Comprimendo e caricando foto...');
            photoUrl = await uploadPhoto(photo, poiId);
            console.log('Foto caricata:', photoUrl);

            // Aggiorna il POI con l'URL della foto
            const { error: updateError } = await supabase
              .from('points')
              .update({ photo_url: photoUrl })
              .eq('id', poiId);

            if (updateError) {
              console.error('Errore nell\'aggiornamento dell\'URL foto:', updateError);
              // Non bloccare la creazione del POI per errori nell'upload foto
            } else {
              // Aggiorna il POI nella lista locale con l'URL della foto
              data[0].photo_url = photoUrl;
            }
          } catch (photoError) {
            console.error('Errore nell\'upload della foto:', photoError);
            alert('POI creato ma errore nel caricamento della foto. Puoi riprovare modificando il POI.');
          }
        }

        console.log('POI added successfully:', data[0]);
        setPois([...pois, data[0]]);
        setShowAddForm(false);
        setNewPoiLocation(null);
      }
    } catch (err) {
      console.error('Error adding POI:', err);
      alert('Errore nella creazione del POI. Riprova.');
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setNewPoiLocation({ lat, lng });
    setShowAddForm(true);
  };

  // Function to refresh POI data
  const refreshPois = () => {
    fetchPois();
  };


  const handleLogout = async () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          {/* Navigation bar is now empty as requested */}
        </div>
      </nav>

      <div className="container mx-auto px-2 py-4">

        {/* Three Horizontal Rows Layout */}
        <div className="flex flex-col gap-3">

          {/* Top Row - Three Columns with Logout in Right Column */}
          <div className="bg-gray-200 border border-indigo-200 rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Left Column - Empty */}
              <div className="text-left">
                {/* Empty left column */}
              </div>

              {/* Center Column - Empty */}
              <div className="text-center">
                {/* Empty center column */}
              </div>

              {/* Right Column - Logout Button */}
              <div className="text-right">
                <button
                  onClick={handleLogout}
                  className="bg-white text-indigo-600 px-6 py-2 rounded-lg border border-indigo-300 hover:bg-indigo-50 font-medium transition-colors inline-flex items-center space-x-2"
                >
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center Row - Map (2/3 of screen height) */}
          <div className="h-[66vh] bg-white border-2 border-indigo-300 rounded-lg overflow-hidden shadow-sm">
            <div style={{ height: '66vh', width: '100%' }}>
              <MapComponent
                pois={pois}
                onMapClick={handleMapClick}
                initialPosition={currentPosition}
                onPoiUpdated={refreshPois}
                currentTeam={user?.team}
                isAdmin={user?.admin === 1}
                newPoiLocation={showAddForm ? newPoiLocation : null}
                onAddPoi={handleAddPoi}
                onCancelAddPoi={() => setShowAddForm(false)}
                filterShowInspectable={filterShowInspectable}
                filterShowNonInspectable={filterShowNonInspectable}
                filterShowPendingApproval={filterShowPendingApproval}
                filterShowCantiere={filterShowCantiere}
                filterShowAltro={filterShowAltro}
                height="66vh"
              />
            </div>
          </div>

          {/* Bottom Row - Controls and Filters */}
          <div className="bg-gray-200 border border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left Column - Empty for balance */}
              <div className="hidden md:block">
                {/* Empty left column for balance */}
              </div>

              {/* Center Column - Center Map Button */}
              <div className="text-center">
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
                  className="bg-indigo-600 text-white px-10 py-4 rounded-lg hover:bg-indigo-700 text-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-md"
                >
                  <span>📍</span>
                  <span>Centra la mappa</span>
                </button>
              </div>

              {/* Right Column - Filters Section */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-medium text-indigo-800 mb-3 text-center">Filtri</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="filter-inspectable"
                      checked={filterShowInspectable}
                      onChange={(e) => setFilterShowInspectable(e.target.checked)}
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
                      checked={filterShowNonInspectable}
                      onChange={(e) => setFilterShowNonInspectable(e.target.checked)}
                      className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="filter-non-inspectable" className="text-sm font-medium text-gray-700">
                      🔴 Già ispezionati
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="filter-pending-approval"
                      checked={filterShowPendingApproval}
                      onChange={(e) => setFilterShowPendingApproval(e.target.checked)}
                      className="h-5 w-5 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <label htmlFor="filter-pending-approval" className="text-sm font-medium text-gray-700">
                      🟡 In attesa di approvazione
                    </label>
                  </div>
                </div>

                <h4 className="font-medium text-indigo-800 mb-2 text-sm">Tipo</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="filter-cantiere"
                      checked={filterShowCantiere}
                      onChange={(e) => setFilterShowCantiere(e.target.checked)}
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
                      checked={filterShowAltro}
                      onChange={(e) => setFilterShowAltro(e.target.checked)}
                      className="h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="filter-altro" className="text-sm font-medium text-gray-700">
                      🔵 Altro
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
