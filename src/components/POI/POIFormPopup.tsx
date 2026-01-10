import React, { useEffect, useState } from 'react';
import { getAddressWithCache } from '../../services/geocodingService';

interface POIFormPopupProps {
  location: { lat: number; lng: number };
  onAddPoi?: (indirizzo: string, ispezionabile: number, tipo: string, note?: string, photo?: File) => void;
  onCancelAddPoi?: () => void;
}

const POIFormPopup: React.FC<POIFormPopupProps> = ({ location, onAddPoi, onCancelAddPoi }) => {
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
            onClick={(e) => {
              e.stopPropagation();
              handleAddPoi();
            }}
            className="bg-green-500 text-white py-1 px-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-xs font-medium"
          >
            📍 Aggiungi Punto
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelAddPoi && onCancelAddPoi();
            }}
            className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs font-medium"
          >
            ❌ Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

export default POIFormPopup;