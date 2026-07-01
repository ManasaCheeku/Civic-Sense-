import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    // Restore session on mount
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setAuthenticating(true);
    try {
      const response = await api.post('/api/login', { email, password });
      const { access_token, role, name, email: userEmail } = response.data;
      
      const userData = { name, email: userEmail, role };
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Login failed. Please check credentials.';
      return { success: false, error: message };
    } finally {
      setAuthenticating(false);
    }
  };

  const register = async (name, email, password, role) => {
    setAuthenticating(true);
    try {
      await api.post('/api/register', { name, email, password, role });
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.detail || 'Registration failed. Try again.';
      return { success: false, error: message };
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, authenticating, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      token: null,
      loading: false,
      authenticating: false,
      login: async () => ({ success: false, error: 'Authentication is unavailable.' }),
      register: async () => ({ success: false, error: 'Registration is unavailable.' }),
      logout: () => {},
    };
  }
  return context;
};
export default AuthContext;
