import React from 'react';
import { supabase } from '../../services/supabaseClient';
import { deletePhotoFromCloudinary } from '../../services/authService';

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
  created_at: string;
  photo_url?: string;
}

interface POIListProps {
  pois: PointOfInterest[];
  onPoiSelect: (poi: PointOfInterest) => void;
  onPoiDeleted?: () => void;
  currentUser?: { username: string; admin: number };
}

const POIList: React.FC<POIListProps> = ({ pois, onPoiSelect, onPoiDeleted, currentUser }) => {
  if (pois.length === 0) {
    return <div className="text-center py-4 text-gray-500">No points of interest yet. Click on the map to add one!</div>;
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {pois.map((poi) => {
        // Check if the POI was created today
        const poiDate = new Date(poi.created_at);
        const today = new Date();
        const isCreatedToday =
          poiDate.getDate() === today.getDate() &&
          poiDate.getMonth() === today.getMonth() &&
          poiDate.getFullYear() === today.getFullYear();

        return (
          <div
            key={poi.id}
            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer relative"
            onClick={() => onPoiSelect(poi)}
          >
            <h3 className="font-medium text-gray-900">{poi.indirizzo}</h3>
            <p className="text-xs text-gray-500 mt-1">
              Username: {poi.username || 'N/D'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(poi.created_at).toLocaleString()} | Team: {poi.team || 'N/D'}
            </p>
            <p className="text-xs text-gray-500">
              Ispezionabile: {poi.ispezionabile ? 'Sì' : 'No'}
            </p>

            {/* Delete button - visible based on admin level and POI status */}
            {(() => {
              // For red POIs (ispezionabile=0)
              if (poi.ispezionabile === 0) {
                if (currentUser?.admin === 2) {
                  return true; // admin=2 can delete all red POIs
                } else if (currentUser?.admin === 1 && isCreatedToday) {
                  return true; // admin=1 can delete red POIs created today
                } else if (currentUser?.admin === 0 && isCreatedToday && poi.username === currentUser?.username) {
                  return true; // admin=0 can delete red POIs created today by themselves
                }
                return false;
              }
              // For green POIs (ispezionabile=1)
              else if (poi.ispezionabile === 1) {
                if (currentUser?.admin !== 0) {
                  return true; // admins can delete all green POIs
                } else if (isCreatedToday && poi.username === currentUser?.username) {
                  return true; // admin=0 can delete green POIs created today by themselves
                }
                return false;
              }
              // For yellow POIs (ispezionabile=2)
              else {
                return isCreatedToday; // Can delete yellow POIs created today regardless of admin level
              }
            })() && (
              <button
                onClick={async (e) => {
                  e.stopPropagation(); // Prevent triggering the onPoiSelect
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
                      // Refresh the POI list
                      if (onPoiDeleted) {
                        onPoiDeleted();
                      }
                    }
                  } catch (err) {
                    console.error('Error deleting POI:', err);
                  }
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                title="Elimina"
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default POIList;
