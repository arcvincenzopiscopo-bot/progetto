import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map component error:', error, errorInfo);

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI for map errors
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center p-6">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Errore nella visualizzazione della mappa
            </h3>
            <p className="text-gray-600 mb-4 max-w-md">
              Si è verificato un problema nel caricamento della mappa. Questo potrebbe essere dovuto a
              problemi di connessione o a un errore temporaneo.
            </p>
            <div className="space-y-2">
              <button
                onClick={this.handleRetry}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                🔄 Riprova
              </button>
              <p className="text-xs text-gray-500">
                Se il problema persiste, ricarica la pagina
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                  Dettagli errore (solo sviluppo)
                </summary>
                <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-auto max-w-md">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
