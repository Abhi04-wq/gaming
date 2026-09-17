import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shortenAddress } from '../services/web3Service';
import LogoC from '../LogoC.png';
import {
  LogOut,
  Copy,
  Check,
  Zap,
  Globe,
  Wallet,
  Gamepad2,
} from 'lucide-react';

export default function Navbar({ onCopyToast }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      if (onCopyToast) onCopyToast('Wallet address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Ethereum';
      case 56:
        return 'BNB Chain';
      case 137:
        return 'Polygon';
      case 11155111:
        return 'Sepolia';
      default:
        return `EVM (${chainId || 1})`;
    }
  };

  return (
    <header className="web3-navbar">
      <div className="navbar-container-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link to="/games" className="logo-brand">
            <div className="logo-icon logo-icon-img-wrap">
              <img src={LogoC} alt="LXT Logo" className="navbar-lxt-logo" />
            </div>
            <span>
              L<span style={{ color: '#00E676' }}>XT</span>
            </span>
          </Link>

          {/* Primary Navigation Menu */}
          {user && (
            <nav className="navbar-links">
              <Link
                to="/games"
                className={`nav-item-link ${location.pathname === '/games' || location.pathname === '/' ? 'active' : ''}`}
              >
                <Gamepad2 size={16} />
                <span>Games Lobby</span>
              </Link>
            </nav>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              {/* Live USDT Balance Chip */}
              <Link
                to="/dashboard"
                className="navbar-balance-chip"
                title="Click to view Wallet Dashboard"
              >
                <div className="balance-dot" />
                <div className="balance-info">
                  <span className="balance-label">USDT</span>
                  <span className="balance-val">{user?.usdtBalance || '0.00'}</span>
                </div>
              </Link>

            {/* Wallet Address Pill with Copy */}
            <div className="navbar-wallet-pill">
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00E676',
                  boxShadow: '0 0 6px #00E676',
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#FFFFFF',
                }}
              >
                {shortenAddress(user.walletAddress)}
              </span>
              <button
                onClick={handleCopy}
                title="Copy full wallet address"
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#00E676' : '#A3A3A3',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{
                border: '1px solid #242424',
                color: '#FF5252',
                background: 'rgba(255, 82, 82, 0.08)',
                padding: '8px 14px',
              }}
            >
              <LogOut size={16} />
              <span style={{ fontSize: '0.85rem' }}>Logout</span>
            </button>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
              Login
            </Link>
            <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.88rem' }}>
              Create Account
            </Link>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
