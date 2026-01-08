import React, { useState } from 'react';

interface PasswordChangePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChange: (newPassword: string) => Promise<boolean>;
}

const PasswordChangePopup: React.FC<PasswordChangePopupProps> = ({
  isOpen,
  onClose,
  onPasswordChange
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazione password
    if (newPassword.length < 6) {
      setError('La password deve essere lunga almeno 6 caratteri');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    setLoading(true);

    try {
      const success = await onPasswordChange(newPassword);
      if (success) {
        // Reset form
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      } else {
        setError('Errore durante l\'aggiornamento della password. Riprova.');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Errore durante l\'aggiornamento della password. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-yellow-100 rounded-full p-3">
            <span className="text-2xl">🔐</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
          Cambia Password
        </h2>

        <p className="text-sm text-gray-600 text-center mb-6">
          Per motivi di sicurezza, devi cambiare la password di default prima di continuare.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nuova Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Inserisci la nuova password"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimo 6 caratteri
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Conferma Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Conferma la nuova password"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Aggiornando...' : 'Invia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChangePopup;