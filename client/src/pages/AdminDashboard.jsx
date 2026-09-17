import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getAdminSession,
  logoutAdmin,
  getAdminGamesList,
  toggleGameStatus,
  updateGameConfig,
} from '../services/adminAuthService';
import { api } from '../services/api';
import LogoWebp from '../logo.webp';
import Toast from '../components/Toast';
import {
  Gamepad2,
  ShieldCheck,
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  Play,
  X,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  LogOut,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Eye,
  Activity,
  Flame,
  Sparkles,
  Layers,
  HelpCircle,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Coins,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminUser = getAdminSession();

  const [games, setGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [previewGame, setPreviewGame] = useState(null);
  const [inspectGame, setInspectGame] = useState(null);
  const [configuringGame, setConfiguringGame] = useState(null);
  const [configEntryPool, setConfigEntryPool] = useState('');
  const [configPrizePool, setConfigPrizePool] = useState('');
  const [configThresholdScore, setConfigThresholdScore] = useState('500');
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedGameId, setCopiedGameId] = useState(null);

  // All Income History (every credit + debit saved in DB)
  const [incomeSummary, setIncomeSummary] = useState({
    totalCredit: '0.00',
    totalDebit: '0.00',
    netEarnings: '0.00',
    creditCount: 0,
    debitCount: 0,
    totalTransactions: 0,
  });
  const [incomeTxs, setIncomeTxs] = useState([]);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [incomeFilter, setIncomeFilter] = useState('all'); // 'all' | 'credit' | 'debit'
  const [incomeSearch, setIncomeSearch] = useState('');

  // Platform stats — always loaded live from database (no hardcoded numbers)
  const [adminStats, setAdminStats] = useState({
    userCount: 0,
    totalTransactions: 0,
    totalCredit: '0.00',
    totalDebit: '0.00',
    netEarnings: '0.00',
    creditCount: 0,
    debitCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchAdminStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.getAdminStats();
      if (res.success && res.stats) {
        setAdminStats(res.stats);
      }
    } catch (err) {
      console.error('[Admin Stats Error]', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load games from service
  const reloadGames = () => {
    const list = getAdminGamesList();
    setGames(list);
  };

  useEffect(() => {
    reloadGames();
  }, []);

  // Fetch ALL users income history from database
  const fetchAllIncome = async (typeOverride = null, searchOverride = null) => {
    setIncomeLoading(true);
    try {
      const type = typeOverride !== null ? typeOverride : incomeFilter;
      const search = searchOverride !== null ? searchOverride : incomeSearch;
      const res = await api.getAllTransactions({
        type: type === 'all' ? null : type,
        search: search.trim(),
        limit: 200,
      });
      if (res.success) {
        setIncomeSummary(res.summary);
        setIncomeTxs(res.transactions || []);
      }
    } catch (err) {
      console.error('[Admin Income History Error]', err);
      setToastMessage({ text: 'Failed to load income history from database.', type: 'error' });
    } finally {
      setIncomeLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIncome();
    fetchAdminStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleIncomeFilterChange = (newFilter) => {
    setIncomeFilter(newFilter);
    fetchAllIncome(newFilter, incomeSearch);
  };

  const handleIncomeSearchChange = (value) => {
    setIncomeSearch(value);
    clearTimeout(handleIncomeSearchChange._t);
    handleIncomeSearchChange._t = setTimeout(() => fetchAllIncome(incomeFilter, value), 500);
  };

  const formatIncomeDate = (dateStr) => {
    if (!dateStr) return 'â€”';
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setToastMessage({ text: 'Logged out of admin console.', type: 'info' });
    setTimeout(() => {
      navigate('/admin/login');
    }, 400);
  };

  // Toggle Game Active / Paused
  const handleToggleStatus = (gameId, e) => {
    e?.stopPropagation();
    const newStatus = toggleGameStatus(gameId);
    reloadGames();
    setToastMessage({
      text: `Game ${newStatus === 'active' ? 'activated' : 'paused'} successfully.`,
      type: 'success',
    });
  };

  // Copy Game Embed URL
  const handleCopyUrl = (game, e) => {
    e?.stopPropagation();
    const url = game.embedUrl || `https://gamescdn.gamezop.com/_game-files/${game.gzCode}/index.html`;
    navigator.clipboard.writeText(url);
    setCopiedGameId(game.id);
    setToastMessage({ text: `Copied embed URL for "${game.title}"!`, type: 'success' });
    setTimeout(() => setCopiedGameId(null), 2000);
  };

  // Open Game Pool Configuration Modal
  const handleOpenConfig = (game, e) => {
    e?.stopPropagation();
    setConfiguringGame(game);
    setConfigEntryPool(game.entryPool || '1.00');
    setConfigPrizePool(game.prizePool || '100.00');
    setConfigThresholdScore(game.thresholdScore || '500');
  };

  // Save Game Pool Configuration
  const handleSaveConfig = (e) => {
    e?.preventDefault();
    if (!configuringGame) return;

    try {
      updateGameConfig(configuringGame.id, {
        entryPool: configEntryPool,
        prizePool: configPrizePool,
        thresholdScore: configThresholdScore,
      });
      reloadGames();
      setToastMessage({
        text: `Configuration saved for "${configuringGame.title}"! Entry: ${configEntryPool} USDT, Prize: ${configPrizePool} USDT, Threshold: ${configThresholdScore} pts`,
        type: 'success',
      });
      setConfiguringGame(null);
    } catch (err) {
      setToastMessage({ text: 'Failed to update pools: ' + err.message, type: 'error' });
    }
  };

  // Filtered games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'originals' && g.category !== 'originals') return false;
        if (selectedCategory === 'table' && g.category !== 'table') return false;
      }
      // Status filter
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = g.title?.toLowerCase().includes(q);
        const matchCode = g.gzCode?.toLowerCase().includes(q);
        const matchCategory = g.categoryLabel?.toLowerCase().includes(q);
        if (!matchTitle && !matchCode && !matchCategory) return false;
      }
      return true;
    });
  }, [games, selectedCategory, statusFilter, searchQuery]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#090B10',
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        paddingBottom: '80px',
      }}
    >
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

      {/* Top Admin Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(13, 16, 23, 0.92)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0, 230, 118, 0.2)',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={LogoWebp}
            alt="Loyalty Game"
            style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '50%' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                Loyalty Game
              </span>
              <span
                style={{
                  background: 'rgba(0, 230, 118, 0.15)',
                  color: '#00E676',
                  border: '1px solid rgba(0, 230, 118, 0.35)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Admin Console
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00E676' }} />
              <span>{adminUser?.email || 'Admin'} (Super Admin)</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '30px 24px' }}>
        {/* KPI / Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '18px',
            marginBottom: '32px',
          }}
        >
          {/* Total Users (from database) */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: 'rgba(15, 18, 26, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, fontWeight: 500 }}>Total Users</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF' }}>
                {statsLoading ? '…' : adminStats.userCount.toLocaleString()}
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', marginLeft: '8px', fontWeight: 600 }}>
                  registered
                </span>
              </h3>
            </div>
          </div>

          {/* Total Transactions (from database) */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: 'rgba(15, 18, 26, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(0, 230, 118, 0.12)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00E676',
              }}
            >
              <Activity size={24} />
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, fontWeight: 500 }}>Total Transactions</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF' }}>
                {statsLoading ? '…' : adminStats.totalTransactions.toLocaleString()}
                <span style={{ fontSize: '0.78rem', color: '#00E676', marginLeft: '6px', fontWeight: 600 }}>
                  all time
                </span>
              </h3>
            </div>
          </div>

          {/* Total Credited (from database) */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: 'rgba(15, 18, 26, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, fontWeight: 500 }}>Total Credited</p>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', color: '#00E676' }}>
                {statsLoading ? '…' : `+${adminStats.totalCredit}`}
                <span style={{ fontSize: '0.78rem', color: '#00E676', marginLeft: '6px', fontWeight: 600 }}>
                  USDT
                </span>
              </h3>
            </div>
          </div>

          {/* Total Debited (from database) */}
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '18px',
              background: 'rgba(15, 18, 26, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f87171',
              }}
            >
              <TrendingDown size={24} />
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, fontWeight: 500 }}>Total Debited</p>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', color: '#f87171' }}>
                {statsLoading ? '…' : `-${adminStats.totalDebit}`}
                <span style={{ fontSize: '0.78rem', color: '#f87171', marginLeft: '6px', fontWeight: 600 }}>
                  USDT
                </span>
              </h3>
            </div>
          </div>
        </div>

        {/* All Income History â€” every credit + debit saved in database */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '18px',
            background: 'rgba(15, 18, 26, 0.85)',
            border: '1px solid rgba(0, 230, 118, 0.25)',
            padding: '22px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(0, 230, 118, 0.12)',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00E676',
                }}
              >
                <Coins size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  All Income History
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                  Every credit (green) and debit (red) from all users â€” credits: {incomeSummary.creditCount}, debits:{' '}
                  {incomeSummary.debitCount}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search wallet, game, ref ID..."
                  value={incomeSearch}
                  onChange={(e) => handleIncomeSearchChange(e.target.value)}
                  style={{
                    padding: '8px 12px 8px 34px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                    minWidth: '220px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '3px',
                  borderRadius: '10px',
                  gap: '3px',
                }}
              >
                {[
                  { id: 'all', label: 'All' },
                  { id: 'credit', label: 'Credits' },
                  { id: 'debit', label: 'Debits' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleIncomeFilterChange(tab.id)}
                    style={{
                      background: incomeFilter === tab.id ? '#00E676' : 'transparent',
                      color: incomeFilter === tab.id ? '#090B10' : '#94a3b8',
                      border: 'none',
                      padding: '5px 12px',
                      borderRadius: '7px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => fetchAllIncome()}
                disabled={incomeLoading}
                title="Reload income history"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <RotateCw size={14} />
                <span>{incomeLoading ? 'Loading...' : 'Reload'}</span>
              </button>
            </div>
          </div>

          {/* Platform totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                background: 'rgba(0, 230, 118, 0.07)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Credits
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#00E676' }}>
                +{incomeSummary.totalCredit} <span style={{ fontSize: '0.75rem' }}>USDT</span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.07)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Debits
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f87171' }}>
                -{incomeSummary.totalDebit} <span style={{ fontSize: '0.75rem' }}>USDT</span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.07)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Net Flow
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>
                {incomeSummary.netEarnings} <span style={{ fontSize: '0.75rem' }}>USDT</span>
              </div>
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                Transactions
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                {incomeSummary.totalTransactions}
              </div>
            </div>
          </div>

          {/* Transactions table */}
          <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <th style={{ padding: '12px 14px' }}>Type</th>
                  <th style={{ padding: '12px 14px' }}>Amount</th>
                  <th style={{ padding: '12px 14px' }}>Wallet</th>
                  <th style={{ padding: '12px 14px' }}>Description</th>
                  <th style={{ padding: '12px 14px' }}>Category</th>
                  <th style={{ padding: '12px 14px' }}>Reference</th>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {incomeLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      Loading income history...
                    </td>
                  </tr>
                ) : incomeTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No transactions found in database yet.
                    </td>
                  </tr>
                ) : (
                  incomeTxs.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    return (
                      <tr
                        key={tx._id || tx.referenceId}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <span
                            style={{
                              background: isCredit ? 'rgba(0, 230, 118, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isCredit ? '#00E676' : '#f87171',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: '10px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {isCredit ? 'Credit' : 'Debit'}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontWeight: 800,
                            color: isCredit ? '#00E676' : '#f87171',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isCredit ? '+' : '-'}
                          {Number(tx.amount || 0).toFixed(2)} USDT
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontFamily: 'monospace',
                            color: '#cbd5e1',
                            fontSize: '0.76rem',
                          }}
                        >
                          {tx.walletAddress
                            ? `${tx.walletAddress.slice(0, 6)}...${tx.walletAddress.slice(-4)}`
                            : 'â€”'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#e2e8f0', maxWidth: '260px' }}>
                          {tx.description || `${tx.gameTitle || 'Transaction'}`}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                          {(tx.category || tx.type || '').replace(/_/g, ' ')}
                        </td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.74rem' }}>
                          {tx.referenceId}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {formatIncomeDate(tx.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action & Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Left: Search & Category Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                placeholder="Search game title, code, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: 'rgba(15, 18, 26, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Category Selector */}
            <div
              style={{
                display: 'inline-flex',
                background: 'rgba(15, 18, 26, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px',
                borderRadius: '12px',
                gap: '4px',
              }}
            >
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'originals', label: 'Originals' },
                { id: 'table', label: 'Table & Cards' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    background: selectedCategory === tab.id ? '#00E676' : 'transparent',
                    color: selectedCategory === tab.id ? '#090B10' : '#94a3b8',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                background: 'rgba(15, 18, 26, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#cbd5e1',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 14px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Status: All</option>
              <option value="active">Active Only</option>
              <option value="paused">Paused Only</option>
            </select>
          </div>

          {/* Right: View Mode */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 18, 26, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '3px',
              }}
            >
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                style={{
                  background: viewMode === 'grid' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
                  color: viewMode === 'grid' ? '#00E676' : '#64748b',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  background: viewMode === 'table' ? 'rgba(0, 230, 118, 0.2)' : 'transparent',
                  color: viewMode === 'table' ? '#00E676' : '#64748b',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <TableIcon size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Games Catalog Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            Platform Games ({filteredGames.length})
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Showing {filteredGames.length} of {games.length} total catalog games
          </span>
        </div>

        {/* Empty Search State */}
        {filteredGames.length === 0 && (
          <div
            className="glass-panel"
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              borderRadius: '20px',
              background: 'rgba(15, 18, 26, 0.6)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
            }}
          >
            <Gamepad2 size={42} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF', marginBottom: '6px' }}>No games match your query</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '18px' }}>
              Try adjusting your search terms or clearing your category filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* VIEW 1: GRID CARDS VIEW */}
        {viewMode === 'grid' && filteredGames.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredGames.map((game) => {
              const isPaused = game.status === 'paused';
              const isCopied = copiedGameId === game.id;

              return (
                <div
                  key={game.id}
                  className="glass-panel"
                  style={{
                    borderRadius: '20px',
                    overflow: 'hidden',
                    background: 'rgba(15, 18, 26, 0.85)',
                    border: isPaused ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                    opacity: isPaused ? 0.75 : 1,
                  }}
                >
                  {/* Game Cover Preview */}
                  <div style={{ position: 'relative', width: '100%', height: '145px', overflow: 'hidden' }}>
                    <img
                      src={game.coverUrl}
                      alt={game.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: isPaused ? 'grayscale(80%)' : 'none',
                      }}
                      onError={(e) => {
                        e.target.src = game.logoUrl || LogoWebp;
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15,18,26,0.95) 100%)',
                      }}
                    />

                    {/* Top Badges */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        right: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      {/* Tag Pill */}
                      <span
                        style={{
                          background: game.tagColor || '#00E676',
                          color: '#090B10',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {game.tag || 'GAME'}
                      </span>

                      {/* Status Toggle Badge */}
                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(game.id, e)}
                        title="Click to toggle game status"
                        style={{
                          background: isPaused ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 230, 118, 0.9)',
                          color: isPaused ? '#FFFFFF' : '#090B10',
                          border: 'none',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isPaused ? '#FFFFFF' : '#090B10',
                          }}
                        />
                        <span>{isPaused ? 'Paused' : 'Active'}</span>
                      </button>
                    </div>

                    {/* Circle Logo Thumbnail Overlap */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '14px',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: '2px solid rgba(0, 230, 118, 0.5)',
                        background: '#090B10',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      }}
                    >
                      <img
                        src={game.logoUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = LogoWebp;
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '14px 18px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 2px 0', color: '#FFFFFF' }}>
                        {game.title}
                      </h4>
                      <p style={{ color: '#00E676', fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>
                        {game.categoryLabel || game.category}
                      </p>
                    </div>

                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: '#94a3b8',
                        margin: '0 0 14px 0',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {game.description}
                    </p>

                    {/* Game Stats Chips */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        marginBottom: '16px',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>RTP</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00E676' }}>{game.rtp || '99%'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Max Win</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24' }}>{game.maxWin || '1000x'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Players</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1' }}>{game.players || '1,000'}</div>
                      </div>
                    </div>

                    {/* Pools & Threshold Metrics Display */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px',
                        background: 'rgba(0, 230, 118, 0.05)',
                        border: '1px solid rgba(0, 230, 118, 0.18)',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          Entry Pool
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {game.entryPool || '1.00'} <span style={{ fontSize: '0.68rem', color: '#00E676' }}>USDT</span>
                        </span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          Prize Pool
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#00E676' }}>
                          {game.prizePool || '100.00'} <span style={{ fontSize: '0.68rem', color: '#00E676' }}>USDT</span>
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.64rem', color: '#FFB300', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                          Win Score
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FFB300' }}>
                          {game.thresholdScore || '500'} <span style={{ fontSize: '0.68rem' }}>PTS</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {/* Preview / Test Play */}
                        <button
                          onClick={() => setPreviewGame(game)}
                          style={{
                            background: 'rgba(0, 230, 118, 0.15)',
                            border: '1px solid rgba(0, 230, 118, 0.4)',
                            color: '#00E676',
                            borderRadius: '10px',
                            padding: '9px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0, 230, 118, 0.25)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0, 230, 118, 0.15)')}
                        >
                          <Play size={14} fill="#00E676" />
                          <span>Test Play</span>
                        </button>

                        {/* Configuration Button */}
                        <button
                          onClick={(e) => handleOpenConfig(game, e)}
                          title="Configure Entry Pool & Prize Pool"
                          style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38bdf8',
                            borderRadius: '10px',
                            padding: '9px 12px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.25)')}
                          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)')}
                        >
                          <SlidersHorizontal size={14} />
                          <span>Configure</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                        {/* Inspect Details */}
                        <button
                          onClick={() => setInspectGame(game)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: '#e2e8f0',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)')}
                          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                        >
                          <Eye size={14} />
                          <span>Inspect</span>
                        </button>

                        {/* Copy URL */}
                        <button
                          onClick={(e) => handleCopyUrl(game, e)}
                          title="Copy direct GameZop embed URL"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: isCopied ? '#00E676' : '#94a3b8',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isCopied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: TABLE VIEW */}
        {viewMode === 'table' && filteredGames.length > 0 && (
          <div
            className="glass-panel"
            style={{
              borderRadius: '18px',
              overflow: 'hidden',
              background: 'rgba(15, 18, 26, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      color: '#94a3b8',
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <th style={{ padding: '14px 18px' }}>Game</th>
                    <th style={{ padding: '14px 18px' }}>GZ Code</th>
                    <th style={{ padding: '14px 18px' }}>Category</th>
                    <th style={{ padding: '14px 18px' }}>RTP</th>
                    <th style={{ padding: '14px 18px' }}>Max Win</th>
                    <th style={{ padding: '14px 18px' }}>Players</th>
                    <th style={{ padding: '14px 18px' }}>Entry Pool</th>
                    <th style={{ padding: '14px 18px' }}>Prize Pool</th>
                    <th style={{ padding: '14px 18px' }}>Win Score</th>
                    <th style={{ padding: '14px 18px' }}>Status</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => {
                    const isPaused = game.status === 'paused';
                    return (
                      <tr
                        key={game.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                          transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Game info */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={game.logoUrl}
                              alt=""
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = LogoWebp;
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{game.title}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {game.id}</div>
                            </div>
                          </div>
                        </td>

                        {/* GameZop Code */}
                        <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#94a3b8' }}>
                          {game.gzCode}
                        </td>

                        {/* Category */}
                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                          {game.categoryLabel}
                        </td>

                        {/* RTP */}
                        <td style={{ padding: '14px 18px', color: '#00E676', fontWeight: 700 }}>
                          {game.rtp || '99%'}
                        </td>

                        {/* Max Win */}
                        <td style={{ padding: '14px 18px', color: '#fbbf24', fontWeight: 700 }}>
                          {game.maxWin || '1000x'}
                        </td>

                        {/* Players */}
                        <td style={{ padding: '14px 18px', color: '#cbd5e1' }}>
                          {game.players || '1,000'}
                        </td>

                        {/* Entry Pool */}
                        <td style={{ padding: '14px 18px', fontWeight: 600, color: '#FFFFFF' }}>
                          {game.entryPool || '1.00'} <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>USDT</span>
                        </td>

                        {/* Prize Pool */}
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#00E676' }}>
                          {game.prizePool || '100.00'} <span style={{ fontSize: '0.74rem', color: '#00E676' }}>USDT</span>
                        </td>

                        {/* Win Score Threshold */}
                        <td style={{ padding: '14px 18px', fontWeight: 800, color: '#FFB300' }}>
                          {game.thresholdScore || '500'} <span style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>pts</span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            type="button"
                            onClick={(e) => handleToggleStatus(game.id, e)}
                            style={{
                              background: isPaused ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 230, 118, 0.15)',
                              color: isPaused ? '#f87171' : '#00E676',
                              border: isPaused
                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                : '1px solid rgba(0, 230, 118, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            â— {isPaused ? 'Paused' : 'Active'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setPreviewGame(game)}
                              title="Test Play in Admin"
                              style={{
                                background: 'rgba(0, 230, 118, 0.15)',
                                border: '1px solid rgba(0, 230, 118, 0.3)',
                                color: '#00E676',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Play size={13} fill="#00E676" />
                              <span>Play</span>
                            </button>

                            <button
                              onClick={(e) => handleOpenConfig(game, e)}
                              title="Configure Entry Pool & Prize Pool"
                              style={{
                                background: 'rgba(56, 189, 248, 0.15)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <SlidersHorizontal size={13} />
                              <span>Config</span>
                            </button>

                            <button
                              onClick={() => setInspectGame(game)}
                              title="Inspect Details"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#e2e8f0',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                              }}
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              onClick={(e) => handleCopyUrl(game, e)}
                              title="Copy GameZop URL"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94a3b8',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                              }}
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: TEST PLAY GAME MODAL */}
      {/* ========================================================================= */}
      {previewGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPreviewGame(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '960px',
              height: '88vh',
              borderRadius: '24px',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              background: '#0a0d14',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8), 0 0 50px rgba(0, 230, 118, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                background: 'rgba(15, 18, 26, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={previewGame.logoUrl}
                  alt=""
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = LogoWebp;
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {previewGame.title}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#00E676' }}>
                    Admin Test Preview â€¢ Code: {previewGame.gzCode}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  to={`/play/${previewGame.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#e2e8f0',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open Full Screen</span>
                </Link>

                <button
                  onClick={() => setPreviewGame(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#94a3b8',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Game Iframe */}
            <div style={{ flex: 1, position: 'relative', background: '#000000' }}>
              <iframe
                src={previewGame.directUrl || previewGame.embedUrl || `https://gamescdn.gamezop.com/_game-files/${previewGame.gzCode}/index.html`}
                title={previewGame.title}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
                allow="autoplay; fullscreen; camera; microphone"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INSPECT GAME DETAILS MODAL */}
      {/* ========================================================================= */}
      {inspectGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setInspectGame(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              background: '#0d1017',
              padding: '28px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <img
                  src={inspectGame.logoUrl}
                  alt=""
                  style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = LogoWebp;
                  }}
                />
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {inspectGame.title}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        background: 'rgba(0, 230, 118, 0.15)',
                        color: '#00E676',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {inspectGame.categoryLabel}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>GZ: {inspectGame.gzCode}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectGame(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', textTransform: 'uppercase', color: '#64748b' }}>
                Description
              </h5>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                {inspectGame.description}
              </p>
            </div>

            {/* Technical Specifications */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>RTP Rate</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#00E676' }}>{inspectGame.rtp}</div>
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Max Multiplier</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>{inspectGame.maxWin}</div>
              </div>
              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Current Players</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{inspectGame.players}</div>
              </div>
            </div>

            {/* Embed & CDN URLs */}
            <div style={{ marginBottom: '20px' }}>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '0.82rem', textTransform: 'uppercase', color: '#64748b' }}>
                Direct CDN Embed URL
              </h5>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <code style={{ fontSize: '0.78rem', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inspectGame.embedUrl || `https://gamescdn.gamezop.com/_game-files/${inspectGame.gzCode}/index.html`}
                </code>
                <button
                  onClick={(e) => handleCopyUrl(inspectGame, e)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    color: '#00E676',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Screenshots Gallery */}
            {inspectGame.screenshots && inspectGame.screenshots.length > 0 && (
              <div>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.82rem', textTransform: 'uppercase', color: '#64748b' }}>
                  Gameplay Screenshots ({inspectGame.screenshots.length})
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {inspectGame.screenshots.map((s, idx) => (
                    <img
                      key={idx}
                      src={s.url}
                      alt={s.title || ''}
                      style={{
                        width: '100%',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIGURE GAME POOLS MODAL */}
      {/* ========================================================================= */}
      {configuringGame && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setConfiguringGame(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '24px',
              border: '1px solid rgba(0, 230, 118, 0.35)',
              background: '#0d1017',
              padding: '28px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.8), 0 0 40px rgba(0, 230, 118, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(0, 230, 118, 0.12)',
                    border: '1px solid rgba(0, 230, 118, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E676',
                  }}
                >
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Game Configuration
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {configuringGame.title} (Code: {configuringGame.gzCode})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setConfiguringGame(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Entry Pool Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Entry Pool (USDT)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Player entry / match stake</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    placeholder="e.g. 1.00"
                    value={configEntryPool}
                    onChange={(e) => setConfigEntryPool(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      paddingRight: '64px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid #2a2f3d',
                      borderRadius: '12px',
                      color: '#FFFFFF',
                      fontSize: '1rem',
                      fontWeight: 700,
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#00E676',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                    }}
                  >
                    USDT
                  </span>
                </div>

                {/* Quick Presets for Entry Pool */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['0.50', '1.00', '2.00', '5.00', '10.00', '25.00', '50.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigEntryPool(preset)}
                      style={{
                        background: configEntryPool === preset ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: configEntryPool === preset ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: configEntryPool === preset ? '#00E676' : '#cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prize Pool Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Prize Pool (USDT)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#00E676' }}>Total jackpot / reward payout</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    placeholder="e.g. 100.00"
                    value={configPrizePool}
                    onChange={(e) => setConfigPrizePool(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      paddingRight: '64px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid #2a2f3d',
                      borderRadius: '12px',
                      color: '#00E676',
                      fontSize: '1rem',
                      fontWeight: 800,
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#00E676',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                    }}
                  >
                    USDT
                  </span>
                </div>

                {/* Quick Presets for Prize Pool */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['50.00', '100.00', '250.00', '500.00', '1000.00', '2500.00', '5000.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigPrizePool(preset)}
                      style={{
                        background: configPrizePool === preset ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: configPrizePool === preset ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: configPrizePool === preset ? '#00E676' : '#cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Threshold Score Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Threshold Win Score (Points)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#FFB300' }}>Score needed to claim Prize Pool</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={configThresholdScore}
                    onChange={(e) => setConfigThresholdScore(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      paddingRight: '64px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid #2a2f3d',
                      borderRadius: '12px',
                      color: '#FFB300',
                      fontSize: '1rem',
                      fontWeight: 800,
                      outline: 'none',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#FFB300',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                    }}
                  >
                    PTS
                  </span>
                </div>

                {/* Quick Presets for Threshold Score */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['100', '250', '500', '1000', '2500', '5000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigThresholdScore(preset)}
                      style={{
                        background: configThresholdScore === preset ? 'rgba(255, 179, 0, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: configThresholdScore === preset ? '1px solid #FFB300' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: configThresholdScore === preset ? '#FFB300' : '#cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {preset} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Ratio Preview */}
              {parseFloat(configEntryPool) > 0 && parseFloat(configPrizePool) > 0 && (
                <div
                  style={{
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Prize Multiplier Ratio:</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#00E676' }}>
                    {(parseFloat(configPrizePool) / parseFloat(configEntryPool)).toFixed(1)}x
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setConfiguringGame(null)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontWeight: 700 }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
