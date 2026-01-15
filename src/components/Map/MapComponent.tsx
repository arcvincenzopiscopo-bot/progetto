import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../services/supabaseClient';
import { deletePhotoFromCloudinary } from '../../services/authService';
import { getAddressWithCache } from '../../services/geocodingService';
import POIFormPopup from '../POI/POIFormPopup';
import {
  greenIcon,
  redIcon,
  yellowIcon,
  magentaIcon,
  darkGreyIcon,
  largeDefaultIcon,
  largeGreenIcon,
  largeRedIcon,
  largeYellowIcon,
  largeMagentaIcon,
  largeDarkGreyIcon,
  userLocationIcon,
  constructionGreenIcon,
  constructionRedIcon,
  constructionYellowIcon,
  constructionMagentaIcon,
  constructionDarkGreyIcon,
  largeConstructionGreenIcon,
  largeConstructionRedIcon,
  largeConstructionYellowIcon,
  largeConstructionMagentaIcon,
  largeConstructionDarkGreyIcon
} from '../../constants/icons';

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
}



const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  onPoiSelect?: (poi: PointOfInterest | null) => void; // Callback for POI selection/deselection
  newPoiLocation?: { lat: number; lng: number } | null;
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
}> = ({ onMapClick, onPoiSelect, newPoiLocation }) => {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });

  return null;
};

// Component to handle map clicks for POI deselection
const MapDeselectHandler: React.FC<{
  onPoiSelect?: (poi: PointOfInterest | null) => void;
}> = ({ onPoiSelect }) => {
  useMapEvents({
    click: (e) => {
      // Check if the click was on a marker by looking at the original event target
      // If it's not on a marker, deselect all POIs
      const target = e.originalEvent.target as HTMLElement;
      const isOnMarker = target.closest('.leaflet-marker-icon') !== null;

      if (!isOnMarker && onPoiSelect) {
        onPoiSelect(null); // Deselect all POIs
      }
    },
  });

  return null;
};



const MapComponent: React.FC<MapComponentProps> = React.memo(({ pois, onMapClick, selectedPoi, initialPosition, mapCenter, mapZoom, onPoiUpdated, onPoiSelect, currentTeam, adminLevel = 0, currentUsername, newPoiLocation, onAddPoi, onCancelAddPoi, filterShowInspectable = true, filterShowNonInspectable = true, filterShowPendingApproval = true, filterShowCantiere = true, filterShowAltro = true, filterShow2024 = false, filterShow2025 = false, filterShowToday = false, height, workingPoiId = null, selectedPoiId = null, creatingNewPoi = false }) => {
  // State for map center - initialize once and don't change on position updates
  const [centerPosition, setCenterPosition] = useState<[number, number]>(
    () => initialPosition || [41.9028, 12.4964]
  );

  // Update center when mapCenter prop changes (explicit centering)
  useEffect(() => {
    if (mapCenter) {
      setCenterPosition(mapCenter);
    }
  }, [mapCenter]);

  const [mapKey, setMapKey] = useState(Date.now());

  // State for editing POI addresses
  const [editingAddress, setEditingAddress] = useState<{ [key: string]: string | undefined }>({});
  const [updatingAddress, setUpdatingAddress] = useState<Set<string>>(new Set());

  // Handle address editing for all POIs (historical and current)
  const handleAddressEdit = async (poiId: string, newAddress: string, anno?: number) => {
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
      const tableName = anno ? (anno === 2024 ? 'points_old_2024' : 'points_old_2025') : 'points';

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
      zoomControl={true}
      style={{ height: height || '100%', width: '100%', position: 'relative', zIndex: 1 }}
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
            click: (e) => {
              e.originalEvent.stopPropagation();
              // Trigger POI creation at current location
              onMapClick(initialPosition[0], initialPosition[1]);
            },
          }}
        />
      )}

      {pois
        .filter((poi) => {
          // Apply today filter first (affects all POIs)
          if (filterShowToday) {
            const poiDate = new Date(poi.created_at);
            const today = new Date();
            const isToday = poiDate.getDate() === today.getDate() &&
                           poiDate.getMonth() === today.getMonth() &&
                           poiDate.getFullYear() === today.getFullYear();
            if (!isToday) return false;
          }

          // For historical POIs, only apply type and year filters
          if (poi.anno) {
            if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
            if (poi.tipo === 'altro' && !filterShowAltro) return false;
            if (poi.anno === 2024 && !filterShow2024) return false;
            if (poi.anno === 2025 && !filterShow2025) return false;
            return true;
          }

          // For current POIs, apply all filters including status
          if (poi.ispezionabile === 1 && !filterShowInspectable) return false;
          if (poi.ispezionabile === 0 && !filterShowNonInspectable) return false;
          if (poi.ispezionabile === 2 && !filterShowPendingApproval) return false;
          if (poi.tipo === 'cantiere' && !filterShowCantiere) return false;
          if (poi.tipo === 'altro' && !filterShowAltro) return false;
          return true;
        })
        .map((poi) => {
        // Determine which icon to use based on working/selected state first, then construction type, then year/status
        // Priority: Working POI -> large colored icon (double size, maintains original color)
        // Then: Selected POI -> large colored icon (double size, maintains original color)
        // Then: Construction POIs (cantiere, 2024, 2025) -> construction emoji icons
        // Then: Regular POIs -> colored markers based on status
        let markerIcon;
        const isWorkingOrSelected = workingPoiId === poi.id || selectedPoiId === poi.id;
        const isConstructionType = poi.tipo === 'cantiere' || poi.anno === 2024 || poi.anno === 2025;

        if (isWorkingOrSelected) {
          // This POI is currently being worked on or selected - use large icon with original color
          if (isConstructionType) {
            // Use large construction icons for construction-type POIs
            if (poi.anno === 2024) {
              markerIcon = largeConstructionMagentaIcon; // 🏗️ Large magenta construction for 2024 working/selected POI
            } else if (poi.anno === 2025) {
              markerIcon = largeConstructionDarkGreyIcon; // 🏗️ Large dark grey construction for 2025 working/selected POI
            } else if (poi.ispezionabile === 2) {
              markerIcon = largeConstructionYellowIcon; // 🏗️ Large yellow construction for pending approval working/selected POI
            } else {
              markerIcon = poi.ispezionabile === 1 ? largeConstructionGreenIcon : largeConstructionRedIcon; // 🏗️ Large green or red construction
            }
          } else {
            // Use regular large icons for non-construction POIs
            if (poi.ispezionabile === 2) {
              markerIcon = largeYellowIcon; // 🟡 Large yellow for pending approval working/selected POI
            } else {
              markerIcon = poi.ispezionabile === 1 ? largeGreenIcon : largeRedIcon; // 🟢 Large green or 🔴 Large red
            }
          }
        } else if (isConstructionType) {
          // Construction-type POIs use construction emoji icons
          if (poi.anno === 2024) {
            markerIcon = constructionMagentaIcon; // 🏗️ Magenta construction for 2024
          } else if (poi.anno === 2025) {
            markerIcon = constructionDarkGreyIcon; // 🏗️ Dark grey construction for 2025
          } else if (poi.ispezionabile === 2) {
            markerIcon = constructionYellowIcon; // 🏗️ Yellow construction for pending approval
          } else {
            markerIcon = poi.ispezionabile === 1 ? constructionGreenIcon : constructionRedIcon; // 🏗️ Green or red construction
          }
        } else {
          // Regular POIs use standard colored markers
          if (poi.ispezionabile === 2) {
            markerIcon = yellowIcon;
          } else {
            markerIcon = poi.ispezionabile === 1 ? greenIcon : redIcon;
          }
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
                  {/* Editable address for all POIs */}
                  <div className="mb-1">
                    <label className="block text-xs text-gray-500 mb-1">Indirizzo (modificabile):</label>
                    <input
                      type="text"
                      value={editingAddress[poi.id] !== undefined ? editingAddress[poi.id] : poi.indirizzo || ''}
                      onChange={(e) => setEditingAddress(prev => ({ ...prev, [poi.id]: e.target.value }))}
                      onBlur={(e) => handleAddressEdit(poi.id, e.target.value, poi.anno)}
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
                  {/* Fixed 5-slot button layout for uniform popup sizes */}
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
                              const confirmed = window.confirm('Sei sicuro di voler eliminare questo punto di interesse? Questa azione non può essere annullata.');
                              if (!confirmed) return;
                              try {
                                let tableName = 'points';
                                if (poi.anno) {
                                  tableName = poi.anno === 2024 ? 'points_old_2024' : 'points_old_2025';
                                }
                                if (poi.photo_url) {
                                  await deletePhotoFromCloudinary(poi.photo_url).catch(() => {});
                                }
                                const { error } = await supabase.from(tableName).delete().eq('id', poi.id);
                                if (!error && onPoiUpdated) onPoiUpdated([poi.latitudine, poi.longitudine], 14);
                              } catch (err) {
                                console.error('Error deleting POI:', err);
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
                                  setMapKey(Date.now());
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
                                  setMapKey(Date.now());
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

                      // Return fixed layout with 2 rows (3 buttons + 2 buttons)
                      return (
                        <>
                          <div className="flex gap-2">
                            {buttonSlots.slice(0, 3)}
                          </div>
                          <div className="flex gap-2">
                            {buttonSlots.slice(3, 5)}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
          </Popup>
        </Marker>
        );
      })}



      <MapClickHandler onMapClick={onMapClick} onAddPoi={onAddPoi} onCancelAddPoi={onCancelAddPoi} />
      <MapDeselectHandler onPoiSelect={onPoiSelect} />
    </MapContainer>
  );
});

MapComponent.displayName = 'MapComponent';

export default MapComponent;
