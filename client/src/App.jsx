import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GamesLobby from './pages/GamesLobby';
import GamePlay from './pages/GamePlay';
import AuthGuard from './components/AuthGuard';
import CursorParticleTrail from './components/CursorParticleTrail';

// Helper component for Root Route redirect - directly leads to Games Lobby upon login
function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/games' : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Interactive Cursor Particle Trail */}
      <CursorParticleTrail />

      <div className="ambient-bg">
        <div className="blob-1" />
        <div className="blob-2" />
        <div className="ambient-grid" />
      </div>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/games"
            element={
              <AuthGuard>
                <GamesLobby />
              </AuthGuard>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/play/:gameId"
            element={
              <AuthGuard>
                <GamePlay />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
