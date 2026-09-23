import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Gift,
  User,
  Settings,
  LogOut,
  Gamepad2,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Games', icon: <Gamepad2 size={18} />, path: '/games', badge: 'HOT' },
    { label: 'Income Details', icon: <ArrowLeftRight size={18} />, path: '/income-details', badge: 'Ledger' },
    { label: 'LXT Vault', icon: <Wallet size={18} />, path: '#wallet', badge: 'Live' },
    { label: 'VIP Rewards', icon: <Gift size={18} />, path: '#rewards', badge: 'New' },
    { label: 'Leaderboard', icon: <TrendingUp size={18} />, path: '#leaderboard' },
    { label: 'Profile Settings', icon: <User size={18} />, path: '#profile' },
  ];

  return (
    <aside className="web3-sidebar">
      <div className="sidebar-nav">
        <div
          style={{
            fontSize: '0.72rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#737373',
            padding: '4px 16px 10px 16px',
            fontWeight: 700,
          }}
        >
          Menu
        </div>

        {navItems.map((item, idx) => {
          const isRouterPath = item.path.startsWith('/');

          if (isRouterPath) {
            return (
              <NavLink
                key={idx}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background:
                        item.badge === 'HOT'
                          ? 'rgba(255, 82, 82, 0.15)'
                          : item.badge === 'Live'
                          ? 'rgba(0, 230, 118, 0.12)'
                          : 'rgba(255, 255, 255, 0.05)',
                      color:
                        item.badge === 'HOT'
                          ? '#FF5252'
                          : item.badge === 'Live'
                          ? '#00E676'
                          : '#A3A3A3',
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          }

          return (
            <a
              key={idx}
              href={item.path}
              className="sidebar-link"
              onClick={(e) => e.preventDefault()}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#A3A3A3',
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Sidebar Footer */}
      <div
        style={{
          borderTop: '1px solid #242424',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            background: '#121212',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #242424',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#A3A3A3', marginBottom: '4px' }}>
            Account ID
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: '#00E676',
              fontWeight: 700,
            }}
          >
            {user?.accountId || 'USR-Web3'}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{
            background: 'none',
            border: 'none',
            width: '100%',
            cursor: 'pointer',
            color: '#FF5252',
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
