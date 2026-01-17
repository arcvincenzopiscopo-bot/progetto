import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CustomAuthProvider } from './context/CustomAuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/Auth/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import PWAUpdateNotification from './components/PWAUpdateNotification';
import { usePWAUpdate } from './hooks/usePWAUpdate';

// Development Banner Component
const DevelopmentBanner: React.FC = () => {
  // Only show in development environment and on develop branch
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="bg-orange-500 text-white text-center py-2 px-4 text-sm font-medium">
      🚧 VERSIONE DI SVILUPPO - Non utilizzare per uso produttivo 🚧
    </div>
  );
};

// Configure React Router future flags to suppress v7 warnings
// and filter out third-party library warnings in development
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];

    // Filter out React Router v7 future flag warnings
    if (typeof message === 'string' &&
        (message.includes('v7_startTransition') ||
         message.includes('v7_relativeSplatPath') ||
         message.includes('React Router Future Flag Warning'))) {
      return;
    }

    // Filter out third-party CSS warnings
    if (typeof message === 'string' &&
        (message.includes('image-rendering') ||
         message.includes('behavior') ||
         message.includes('progid') ||
         message.includes('Insieme di regole ignorato') ||
         message.includes('Dichiarazione tralasciata') ||
         message.includes('Proprietà sconosciuta'))) {
      return;
    }

    // Filter out MouseEvent deprecation warnings from libraries
    if (typeof message === 'string' &&
        (message.includes('mozPressure') ||
         message.includes('mozInputSource') ||
         (message.includes('MouseEvent') && message.includes('deprecato')))) {
      return;
    }

    originalWarn(...args);
  };
}

function App() {
  const { updateAvailable, updateApp, dismissUpdate } = usePWAUpdate();

  return (
    <ErrorBoundary>
      <DevelopmentBanner />
      <PWAUpdateNotification
        updateAvailable={updateAvailable}
        onUpdate={updateApp}
        onDismiss={dismissUpdate}
      />
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CustomAuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } />
          </Routes>
        </CustomAuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
