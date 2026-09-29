import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('web3_auth_token'));
  const [loading, setLoading] = useState(true);
  const [activeSigner, setActiveSigner] = useState(null);

  // Check existing session on load
  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('web3_auth_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.getMe();
        if (response.success && response.user) {
          setUser(response.user);
        } else {
          logout();
        }
      } catch (error) {
        console.warn('[Session Expired or Invalid]', error.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const loginUser = (authToken, userData, signer = null) => {
    localStorage.setItem('web3_auth_token', authToken);
    setToken(authToken);
    setUser(userData);
    if (signer) setActiveSigner(signer);
  };

  const logout = async () => {
    try {
      await api.logout().catch(() => { });
    } finally {
      localStorage.removeItem('web3_auth_token');
      setToken(null);
      setUser(null);
      setActiveSigner(null);
    }
  };

  const updateBalance = (newBalance) => {
    if (user) {
      setUser((prev) => ({ ...prev, usdtBalance: newBalance }));
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await api.getMe();
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch (err) {
      console.error('[Refresh Profile Error]', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        activeSigner,
        setActiveSigner,
        loginUser,
        logout,
        updateBalance,
        refreshProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
