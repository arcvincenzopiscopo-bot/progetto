import React from 'react';
import { supabase } from '../../services/supabaseClient';
import { deletePhotoFromCloudinary } from '../../services/authService';

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
  created_at: string;
  photo_url?: string;
}

interface POIListProps {
  pois: PointOfInterest[];
  onPoiSelect: (poi: PointOfInterest) => void;
  onPoiDeleted?: () => void;
}

const POIList: React.FC<POIListProps> = ({ pois, onPoiSelect, onPoiDeleted }) => {
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

            {/* Delete button - only visible for records created today */}
            {isCreatedToday && (
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
