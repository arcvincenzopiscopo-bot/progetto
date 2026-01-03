import React, { useState, useEffect } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import MapComponent from '../components/Map/MapComponent';

interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: boolean;
  tipo: string;
  latitudine: number;
  longitudine: number;
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
      const { data, error } = await supabase
        .from('points')
        .select('*')
        .eq('username', user?.username)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPois(data || []);
    } catch (err) {
      console.error('Error fetching POIs:', err);
    }
  };

  const handleAddPoi = async (indirizzo: string, ispezionabile: number, tipo: string) => {
    if (!newPoiLocation || !user) return;

    console.log('Adding POI with data:', {
      indirizzo,
      ispezionabile,
      tipo,
      lat: newPoiLocation.lat,
      lng: newPoiLocation.lng
    });

    try {
      const { data, error } = await supabase
        .from('points')
        .insert([
          {
            indirizzo: "vuoto",
            username: user.username,
            team: user.team || "", // Usa il team dall'utente loggato
            ispezionabile: ispezionabile,
            tipo: tipo,
            latitudine: newPoiLocation.lat,
            longitudine: newPoiLocation.lng,
          },
        ])
        .select();

      console.log('Supabase response:', { data, error });

      if (error) {
        throw error;
      }

      if (data) {
        console.log('POI added successfully:', data[0]);
        setPois([...pois, data[0]]);
        setShowAddForm(false);
        setNewPoiLocation(null);
      }
    } catch (err) {
      console.error('Error adding POI:', err);
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
                newPoiLocation={showAddForm ? newPoiLocation : null}
                onAddPoi={handleAddPoi}
                onCancelAddPoi={() => setShowAddForm(false)}
                filterShowInspectable={filterShowInspectable}
                filterShowNonInspectable={filterShowNonInspectable}
                height="66vh"
              />
            </div>
          </div>

          {/* Bottom Row - Controls and Filters */}
          <div className="bg-gray-200 border border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
              {/* Center Map Button */}
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

              {/* Filters Section */}
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
                      🔴 Non ispezionabili
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
