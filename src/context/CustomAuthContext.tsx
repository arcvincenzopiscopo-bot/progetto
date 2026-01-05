import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, getUserById } from '../services/authService';

interface User {
  id: string;
  username: string;
  team?: string;
  admin?: number;
  created_at: string;
}

interface CustomAuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(undefined);

export const CustomAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verifica se c'è un utente loggato nel sessionStorage
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Verifica che l'utente esista ancora nel database
          const currentUser = await getUserById(parsedUser.id);
          if (currentUser) {
            setUser(currentUser);
          } else {
            sessionStorage.removeItem('currentUser');
          }
        } catch (err) {
          console.error('Error parsing stored user:', err);
          sessionStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Note: Using sessionStorage instead of localStorage to implement the requirement:
  // - Session persists across page refreshes (sessionStorage survives page reloads)
  // - Session is cleared when tab/browser is closed (sessionStorage is cleared on tab/browser close)

  const login = async (username: string, password: string) => {
    try {
      const user = await loginUser(username, password);
      if (user) {
        // Salva l'utente nel sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        setUser(user);
        return { error: null };
      } else {
        return { error: 'Invalid username or password' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Failed to login. Please try again.' };
    }
  };

  const logout = () => {
    // Rimuovi l'utente dal sessionStorage
    sessionStorage.removeItem('currentUser');
    setUser(null);
  };

  return (
    <CustomAuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </CustomAuthContext.Provider>
  );
};

export const useCustomAuth = () => {
  const context = useContext(CustomAuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
};
