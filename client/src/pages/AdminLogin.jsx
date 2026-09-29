import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginAdmin, isAdminAuthenticated } from '../services/adminAuthService';
import LogoWebp from '../logo.webp';
import Toast from '../components/Toast';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();

  // If already logged in, redirect immediately to /admin/dashboard
  React.useEffect(() => {
    if (isAdminAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both admin email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginAdmin(email, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Authentication failed.');
        setToastMessage({ text: res.message, type: 'error' });
        return;
      }

      setToastMessage({
        text: 'Access Granted! Loading Admin Console...',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Main Glass Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          borderRadius: '24px',
          border: '1px solid rgba(0, 230, 118, 0.22)',
          background: 'rgba(15, 17, 23, 0.88)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 230, 118, 0.08)',
          position: 'relative',
        }}
      >
        {/* Top Glow Accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '25%',
            right: '25%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00E676, transparent)',
            borderRadius: '2px',
          }}
        />

        {/* Logo & Brand Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '28px',
          }}
        >
          {/* Glowing Circular Logo Emblem */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 230, 118, 0.16) 0%, rgba(13, 15, 20, 0.95) 100%)',
              border: '1.5px solid rgba(0, 230, 118, 0.45)',
              marginBottom: '16px',
              boxShadow: '0 0 28px rgba(0, 230, 118, 0.25), inset 0 0 14px rgba(0, 230, 118, 0.12)',
              padding: '8px',
            }}
          >
            <img
              src={LogoWebp}
              alt="Loyalty Game"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6))',
              }}
            />
          </div>

          {/* Centered Admin Portal Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 230, 118, 0.08)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              color: '#00E676',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '14px',
              boxShadow: '0 0 14px rgba(0, 230, 118, 0.12)',
            }}
          >
            <ShieldCheck size={13} color="#00E676" />
            <span>Admin Portal</span>
          </div>

          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#FFFFFF',
              marginBottom: '8px',
              letterSpacing: '-0.02em',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Loyalty <span style={{ color: '#00E676' }}>Game</span> Admin
          </h1>
          <p
            style={{
              color: '#9ca3af',
              fontSize: '0.88rem',
              margin: 0,
              maxWidth: '360px',
              lineHeight: 1.5,
            }}
          >
            Sign in with administrative credentials to manage games & platform
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#f87171',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mail size={17} />
              </div>
              <input
                type="email"
                className="web3-input"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                style={{
                  width: '100%',
                  paddingLeft: '42px',
                  background: 'rgba(10, 12, 18, 0.7)',
                  border: '1px solid #2a2f3d',
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: '6px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={17} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="web3-input"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  paddingLeft: '42px',
                  paddingRight: '42px',
                  background: 'rgba(10, 12, 18, 0.7)',
                  border: '1px solid #2a2f3d',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Console</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Bottom Link to Player Lobby */}
        {/* <div
          style={{
            borderTop: '1px solid #222632',
            marginTop: '26px',
            paddingTop: '18px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Gamepad2 size={15} color="#00E676" />
          <span>Need player access?</span>
          <Link
            to="/games"
            style={{
              color: '#00E676',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            onMouseOver={(e) => (e.target.style.color = '#39FF88')}
            onMouseOut={(e) => (e.target.style.color = '#00E676')}
          >
            Go to Games Lobby
          </Link>
        </div> */}
      </div>
    </div>
  );
}
