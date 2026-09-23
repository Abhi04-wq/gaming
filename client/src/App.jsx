import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GamesLobby from './pages/GamesLobby';
import GamePlay from './pages/GamePlay';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import IncomeDetails from './pages/IncomeDetails';
import AuthGuard from './components/AuthGuard';
import AdminGuard from './components/AdminGuard';
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
            element={<Navigate to="/games" replace />}
          />
          <Route
            path="/income-details"
            element={
              <AuthGuard>
                <IncomeDetails />
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
          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminGuard>
                <AdminDashboard />
              </AdminGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
