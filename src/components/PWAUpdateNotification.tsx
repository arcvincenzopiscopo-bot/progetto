import React from 'react';

interface PWAUpdateNotificationProps {
  updateAvailable: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  updateAvailable,
  onUpdate,
  onDismiss
}) => {
  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="font-medium">Aggiornamento disponibile</p>
          <p className="text-sm text-blue-100">Una nuova versione dell'app è pronta per l'installazione</p>
        </div>
      </div>
      <div className="flex space-x-2">
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-sm text-blue-200 hover:text-white hover:bg-blue-700 rounded transition-colors"
        >
          Ignora
        </button>
        <button
          onClick={onUpdate}
          className="px-4 py-1 bg-white text-blue-600 font-medium rounded hover:bg-blue-50 transition-colors"
        >
          Aggiorna
        </button>
      </div>
    </div>
  );
};

export default PWAUpdateNotification;
