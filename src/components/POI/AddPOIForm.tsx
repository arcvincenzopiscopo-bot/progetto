import React, { useState } from 'react';

interface AddPOIFormProps {
  onSubmit: (indirizzo: string, ispezionabile: number, tipo: string) => void;
  onCancel: () => void;
  initialIndirizzo?: string;
}

const AddPOIForm: React.FC<AddPOIFormProps> = ({ onSubmit, onCancel, initialIndirizzo = '' }) => {
  const [indirizzo, setIndirizzo] = useState(initialIndirizzo);
  const [ispezionabile, setIspezionabile] = useState(1); // Default to 1 (Sì)
  const [tipo, setTipo] = useState('cantiere'); // Default to 'cantiere'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (indirizzo.trim()) {
      onSubmit(indirizzo, ispezionabile, tipo);
      setIndirizzo('');
      setIspezionabile(1);
      setTipo('cantiere');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-2 border-indigo-600 rounded-lg p-3 bg-white">
      <div className="space-y-2">
        <h3 className="font-bold text-center bg-indigo-600 text-white py-2 rounded">Aggiungi Punto di Interesse</h3>
        <div>
          <label htmlFor="indirizzo" className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo
          </label>
          <input
            id="indirizzo"
            type="text"
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="ispezionabile" className="block text-sm font-medium text-gray-700 mb-1">
            Ispezionabile
          </label>
          <select
            id="ispezionabile"
            value={ispezionabile}
            onChange={(e) => setIspezionabile(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={1}>Sì</option>
            <option value={0}>No</option>
          </select>
        </div>
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="cantiere">Cantiere</option>
            <option value="altro">Altro</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-sm"
          >
            Aggiungi
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-sm"
          >
            Annulla
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddPOIForm;
