import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchLiveUsdtBalance, shortenAddress } from '../services/web3Service';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import UsdtCard from '../components/UsdtCard';
import Toast from '../components/Toast';
import {
  Wallet,
  ShieldCheck,
  Calendar,
  Clock,
  Fingerprint,
  Globe,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export default function Dashboard() {
  const { user, updateBalance } = useAuth();

  const [liveBalance, setLiveBalance] = useState(user?.usdtBalance || '0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync blockchain USDT balance on load
  useEffect(() => {
    if (user?.walletAddress) {
      handleRefreshBalance();
    }
  }, [user?.walletAddress]);

  const handleRefreshBalance = async () => {
    if (!user?.walletAddress) return;
    setBalanceLoading(true);

    try {
      const result = await fetchLiveUsdtBalance(user.walletAddress, user.chainId || 1);
      setLiveBalance(result.formatted);
      updateBalance(result.formatted);
      setToastMessage({
        text: `USDT Balance synced with blockchain: ${result.formatted} USDT`,
        type: 'success',
      });
    } catch (err) {
      console.error('[Failed to refresh USDT balance]', err);
      setToastMessage({
        text: 'Could not sync live balance from RPC. Using cached balance.',
        type: 'info',
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setToastMessage({ text: `${fieldName} copied to clipboard!`, type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '15 Sep 2026';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '15 Sep 2026';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Just now';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Just now';
    }
  };

  const getNetworkName = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Ethereum Mainnet';
      case 56:
        return 'BNB Smart Chain';
      case 137:
        return 'Polygon PoS';
      case 11155111:
        return 'Sepolia Testnet';
      default:
        return `EVM Network (${chainId || 1})`;
    }
  };

  return (
    <div className="app-container" style={{ backgroundColor: '#050505' }}>
      {/* Toast */}
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Top Navbar */}
      <Navbar onCopyToast={(msg) => setToastMessage({ text: msg, type: 'success' })} />

      {/* Dashboard Body with Sidebar */}
      <div className="dashboard-wrapper">
        <Sidebar />

        <main className="dashboard-main">
          {/* Welcome Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 230, 118, 0.10)',
                  border: '1px solid rgba(0, 230, 118, 0.25)',
                  color: '#00E676',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <span className="pulse-dot" />
                <span>Web3 Session Active</span>
              </div>
              <h1 style={{ fontSize: '2.2rem', marginBottom: '6px', color: '#FFFFFF' }}>
                Welcome to <span className="gradient-text">LXT</span>
              </h1>
              <p style={{ color: '#A3A3A3', fontSize: '0.95rem' }}>
                Manage your decentralized wallet identity, USDT balance, and Web3 portfolio.
              </p>
            </div>

            {/* Account ID Pill */}
            <div
              className="glass-panel"
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                background: '#121212',
                border: '1px solid #242424',
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: '#A3A3A3', textTransform: 'uppercase' }}>
                  Account Identifier
                </span>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#00E676',
                  }}
                >
                  {user?.accountId || 'USR-8F42A1'}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(user?.accountId || 'USR-8F42A1', 'Account ID')}
                style={{
                  background: '#0D0D0D',
                  border: '1px solid #242424',
                  borderRadius: '8px',
                  padding: '8px',
                  color: copiedField === 'Account ID' ? '#00E676' : '#A3A3A3',
                  cursor: 'pointer',
                }}
              >
                {copiedField === 'Account ID' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>

          {/* Large Hero Card: USDT Balance */}
          <div style={{ marginBottom: '32px' }}>
            <UsdtCard
              balance={liveBalance}
              walletAddress={user?.walletAddress || '0x742d...8f44'}
              chainId={user?.chainId || 1}
              onRefresh={handleRefreshBalance}
              isLoading={balanceLoading}
            />
          </div>

          {/* Detailed Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            {/* Wallet Address Card */}
            <div className="glass-panel" style={{ padding: '24px', background: '#121212', border: '1px solid #242424' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0, 230, 118, 0.10)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>Wallet Address</h3>
                    <span style={{ fontSize: '0.78rem', color: '#A3A3A3' }}>EVM Standard</span>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(user?.walletAddress, 'Wallet Address')}
                  className="btn-ghost"
                  style={{ padding: '6px', color: copiedField === 'Wallet Address' ? '#00E676' : '#A3A3A3' }}
                >
                  {copiedField === 'Wallet Address' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.88rem',
                  color: '#FFFFFF',
                  wordBreak: 'break-all',
                  background: '#0D0D0D',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #242424',
                }}
              >
                {user?.walletAddress}
              </div>
            </div>

            {/* Wallet Type */}
            <div className="glass-panel" style={{ padding: '24px', background: '#121212', border: '1px solid #242424' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0, 230, 118, 0.10)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <Fingerprint size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>Wallet Provider</h3>
                    <span style={{ fontSize: '0.78rem', color: '#A3A3A3' }}>Connected Interface</span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    background: 'rgba(0, 230, 118, 0.12)',
                    color: '#00E676',
                    fontWeight: 700,
                  }}
                >
                  Verified
                </span>
              </div>

              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', marginTop: '10px' }}>
                {user?.walletType || 'MetaMask'}
              </div>
            </div>

            {/* Connected Network */}
            <div className="glass-panel" style={{ padding: '24px', background: '#121212', border: '1px solid #242424' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0, 230, 118, 0.10)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>Network</h3>
                    <span style={{ fontSize: '0.78rem', color: '#A3A3A3' }}>Chain ID: {user?.chainId || 1}</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', marginTop: '10px' }}>
                {getNetworkName(user?.chainId)}
              </div>
            </div>

            {/* Account Created & Status */}
            <div className="glass-panel" style={{ padding: '24px', background: '#121212', border: '1px solid #242424' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(0, 230, 118, 0.10)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF' }}>Registration Date</h3>
                    <span style={{ fontSize: '0.78rem', color: '#A3A3A3' }}>MongoDB Record</span>
                  </div>
                </div>

                <div className="status-pill active">
                  <span className="pulse-dot" />
                  <span>Active</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {formatDate(user?.createdAt)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#A3A3A3', marginTop: '4px' }}>
                    Last login: {formatDateTime(user?.lastLoginAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Feature Readiness */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              border: '1px solid #242424',
              background: '#121212',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>Decentralized Actions & Capabilities</h3>
                <p style={{ color: '#A3A3A3', fontSize: '0.88rem' }}>
                  Your cryptographic wallet signature authenticates every session without passwords.
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 230, 118, 0.10)',
                  border: '1px solid rgba(0, 230, 118, 0.25)',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  color: '#00E676',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={16} />
                <span>Zero Seed-Phrase Exposure</span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              <div
                style={{
                  background: '#0D0D0D',
                  border: '1px solid #242424',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <TrendingUp size={16} color="#00E676" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF' }}>USDT Staking</span>
                </div>
                <p style={{ color: '#A3A3A3', fontSize: '0.8rem' }}>
                  Earn up to 8.5% APY on USDT balances through smart contract vaults.
                </p>
              </div>

              <div
                style={{
                  background: '#0D0D0D',
                  border: '1px solid #242424',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Layers size={16} color="#00E676" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF' }}>Cross-Chain Bridge</span>
                </div>
                <p style={{ color: '#A3A3A3', fontSize: '0.8rem' }}>
                  Move USDT between Ethereum, BNB Chain, and Polygon with zero slippage.
                </p>
              </div>

              <div
                style={{
                  background: '#0D0D0D',
                  border: '1px solid #242424',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Sparkles size={16} color="#00E676" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#FFFFFF' }}>Web3 Gaming Hub</span>
                </div>
                <p style={{ color: '#A3A3A3', fontSize: '0.8rem' }}>
                  Connect your Web3 identity to tournaments, achievements, and games.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
