import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shortenAddress } from '../services/web3Service';
import LogoWebp from '../logo.webp';
import {
  LogOut,
  Copy,
  Check,
  Zap,
  Globe,
  Wallet,
  BarChart3,
  Gamepad2,
} from 'lucide-react';

export default function Navbar({ onCopyToast }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  // Tab active state: Games active on lobby + in-game pages, Income Details on ledger page
  const isGamesActive = location.pathname === '/games' || location.pathname.startsWith('/play');
  const isIncomeActive = location.pathname === '/income-details';

  const handleCopy = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      if (onCopyToast) onCopyToast('Wallet address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user-friendly network badge
  const getNetworkBadge = (chainId) => {
    switch (Number(chainId)) {
      case 1:
        return 'Ethereum';
      case 56:
        return 'BSC Mainnet';
      case 137:
        return 'Polygon';
      case 42161:
        return 'Arbitrum';
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
              <img src={LogoWebp} alt="Loyalty Game Logo" className="navbar-lxt-logo" />
            </div>
            <span>
              Loyalty <span style={{ color: '#00E676' }}>Game</span>
            </span>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              {/* Right-side Toggle: Income Details | Game (active follows current route) */}
              <nav
                aria-label="Primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(8, 13, 10, 0.92)',
                  border: '1.5px solid rgba(0, 230, 118, 0.55)',
                  borderRadius: '999px',
                  padding: '4px',
                  boxShadow: '0 0 14px rgba(0, 230, 118, 0.18)',
                }}
              >
                <Link
                  to="/income-details"
                  title="View Income Details - Credits, Debits & Transaction History"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '999px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    ...(isIncomeActive
                      ? {
                          background: 'rgba(0, 230, 118, 0.20)',
                          border: '1.5px solid #00E676',
                          color: '#00E676',
                          boxShadow:
                            '0 0 14px rgba(0, 230, 118, 0.55), inset 0 0 10px rgba(0, 230, 118, 0.18)',
                        }
                      : {
                          background: 'transparent',
                          border: '1.5px solid transparent',
                          color: '#7d8f87',
                        }),
                  }}
                >
                  <BarChart3 size={13} />
                  <span>Income</span>
                </Link>
                <Link
                  to="/games"
                  title="Go to Games Lobby"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '999px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    ...(isGamesActive
                      ? {
                          background: 'rgba(0, 230, 118, 0.20)',
                          border: '1.5px solid #00E676',
                          color: '#00E676',
                          boxShadow:
                            '0 0 14px rgba(0, 230, 118, 0.55), inset 0 0 10px rgba(0, 230, 118, 0.18)',
                        }
                      : {
                          background: 'transparent',
                          border: '1.5px solid transparent',
                          color: '#7d8f87',
                        }),
                  }}
                >
                  <Gamepad2 size={13} />
                  <span>Game</span>
                </Link>
              </nav>

              {/* Live USDT Balance Chip */}
              <Link
                to="/dashboard"
                className="navbar-balance-chip"
                title="Click to view Wallet Dashboard"
              >
                <div className="balance-dot" />
                <div className="balance-info">
                  <span className="balance-label">USDT</span>
                  <span className="balance-val">{user?.usdtBalance !== undefined && user?.usdtBalance !== null ? user.usdtBalance : '0.00'}</span>
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
