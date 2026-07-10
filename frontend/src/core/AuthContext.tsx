import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';
import { supabase } from './supabaseClient';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company: {
    id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (access_token: string, refresh_token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial session load
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem('access_token', session.access_token);
          localStorage.setItem('refresh_token', session.refresh_token);
          await fetchProfile();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Session check failed', err);
        setLoading(false);
      }
    };

    checkSession();

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        localStorage.setItem('access_token', session.access_token);
        localStorage.setItem('refresh_token', session.refresh_token);
        fetchProfile();
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (access_token: string, refresh_token: string) => {
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    fetchProfile();
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Failed to signOut from supabase', err);
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
