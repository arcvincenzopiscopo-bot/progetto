import React, { useState, useEffect } from 'react';
import { useCustomAuth } from '../context/CustomAuthContext';
import { supabase } from '../services/supabaseClient';
import MapComponent from '../components/Map/MapComponent';
import AddPOIForm from '../components/POI/AddPOIForm';

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

const DashboardPage: React.FC = () => {
  const { user, logout } = useCustomAuth();
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setLoading(true);
      const { data, error } = await supabase
        .from('points')
        .select('*')
        .eq('username', user?.username)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPois(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch points of interest');
      console.error('Error fetching POIs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoi = async (indirizzo: string, ispezionabile: number) => {
    if (!newPoiLocation || !user) return;

    try {
      const { data, error } = await supabase
        .from('points')
        .insert([
          {
            indirizzo: "vuoto",
            username: user.username,
            team: user.team || "", // Usa il team dall'utente loggato
            ispezionabile: ispezionabile,
            latitudine: newPoiLocation.lat,
            longitudine: newPoiLocation.lng,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        setPois([...pois, data[0]]);
        setShowAddForm(false);
        setNewPoiLocation(null);
      }
    } catch (err) {
      console.error('Error adding POI:', err);
      if (err instanceof Error) {
        setError(`Failed to add point of interest: ${err.message}`);
      } else {
        setError('Failed to add point of interest');
      }
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

      <div className="container mx-auto p-4">
        {/* Clear page structure with logical flow */}
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-indigo-800 mb-2">Gestione Punti di Interesse</h1>
            <p className="text-gray-600">Visualizza e gestisci i tuoi punti di interesse sulla mappa</p>
          </div>

          {/* Main Controls Section */}
          <div className="bg-white border border-indigo-200 rounded-lg p-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
              {/* Center Map Button - Prominent and Centered */}
              <div className="text-center">
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-600 block mb-1">Posizione attuale</span>
                </div>
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

          {/* Map Section - Full Width */}
          <div className="bg-white border-2 border-indigo-300 rounded-lg overflow-hidden shadow-sm">
            <div className="h-[600px]" style={{ height: '600px' }}>
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
              />
            </div>
          </div>

          {/* User Section - Simplified */}
          <div className="bg-white border border-indigo-200 rounded-lg p-4 shadow-sm text-center">
            <div className="text-lg font-medium text-indigo-800">{user?.username}</div>
            <div className="text-sm text-gray-600 mt-1 mb-3">Benvenuto!</div>
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
    </div>
  );
};

export default DashboardPage;
