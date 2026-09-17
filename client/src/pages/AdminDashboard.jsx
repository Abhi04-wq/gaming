import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import '../styles/admin.css';
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
  Sparkles,
  Coins,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  BarChart3,
  RefreshCw,
  Clock,
  Radio,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminUser = getAdminSession();

  // Active view tab: 'overview' | 'games' | 'ledger' | 'system'
  const [activeTab, setActiveTab] = useState('overview');

  // Games State
  const [games, setGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef(null);

  // Modals State
  const [previewGame, setPreviewGame] = useState(null);
  const [inspectGame, setInspectGame] = useState(null);
  const [configuringGame, setConfiguringGame] = useState(null);
  const [configEntryPool, setConfigEntryPool] = useState('');
  const [configPrizePool, setConfigPrizePool] = useState('');
  const [configThresholdScore, setConfigThresholdScore] = useState('500');
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);

  // All Income / Transaction History (MongoDB)
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
  const [incomeSort, setIncomeSort] = useState('newest'); // 'newest' | 'highest' | 'lowest'

  // Platform live stats from MongoDB
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

  // Auto-refresh interval (optional toggle)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Load games from local storage / catalog service
  const reloadGames = () => {
    const list = getAdminGamesList();
    setGames(list);
  };

  // Fetch admin stats from server
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

  // Fetch all transactions from database
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
    } finally {
      setIncomeLoading(false);
    }
  };

  // Global manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchAdminStats(), fetchAllIncome(), reloadGames()]);
    setLastUpdated(new Date());
    setToastMessage({ text: 'Dashboard data synced with database!', type: 'success' });
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Initial load
  useEffect(() => {
    reloadGames();
    fetchAdminStats();
    fetchAllIncome();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAdminStats();
      fetchAllIncome();
      setLastUpdated(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, incomeFilter, incomeSearch]);

  const handleIncomeFilterChange = (newFilter) => {
    setIncomeFilter(newFilter);
    fetchAllIncome(newFilter, incomeSearch);
  };

  const handleIncomeSearchChange = (value) => {
    setIncomeSearch(value);
    clearTimeout(handleIncomeSearchChange._t);
    handleIncomeSearchChange._t = setTimeout(() => fetchAllIncome(incomeFilter, value), 400);
  };

  const copyToClipboard = (text, keyName, label = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setToastMessage({ text: `${label}!`, type: 'success' });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleLogout = () => {
    logoutAdmin();
    setToastMessage({ text: 'Logged out of admin console.', type: 'info' });
    setTimeout(() => navigate('/admin/login'), 400);
  };

  // Toggle Game Active / Paused with smooth animation
  const handleToggleStatus = (gameId, e) => {
    e?.stopPropagation();
    const newStatus = toggleGameStatus(gameId);
    reloadGames();
    setToastMessage({
      text: `Game ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`,
      type: newStatus === 'active' ? 'success' : 'info',
    });
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
        text: `Configuration updated for "${configuringGame.title}"! Entry: ${configEntryPool} USDT, Prize: ${configPrizePool} USDT`,
        type: 'success',
      });
      setConfiguringGame(null);
    } catch (err) {
      setToastMessage({ text: 'Failed to update pools: ' + err.message, type: 'error' });
    }
  };

  // Export Transactions to CSV
  const handleExportCSV = () => {
    if (incomeTxs.length === 0) {
      setToastMessage({ text: 'No transactions to export.', type: 'info' });
      return;
    }

    const headers = ['Reference ID', 'Type', 'Amount (USDT)', 'Wallet Address', 'Category', 'Description', 'Date'];
    const rows = incomeTxs.map((tx) => [
      tx.referenceId,
      tx.type,
      tx.amount,
      tx.walletAddress,
      tx.category || '',
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      new Date(tx.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({ text: `Exported ${incomeTxs.length} transactions to CSV!`, type: 'success' });
  };

  // Quick simulate test transaction (Allows admin to verify DB logging in real-time)
  const handleSimulateTestTx = async (type) => {
    try {
      const testAddr = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      if (type === 'credit') {
        await api.depositFunds(testAddr, '5.00', 'Admin Simulation: Bonus Credit Test');
        setToastMessage({ text: 'Simulated +5.00 USDT Credit in MongoDB!', type: 'success' });
      } else {
        await api.deductGameEntry(testAddr, 'tower-crash', '1.00', 'Admin Simulation: Match Entry Fee');
        setToastMessage({ text: 'Simulated -1.00 USDT Debit in MongoDB!', type: 'info' });
      }
      handleManualRefresh();
    } catch (err) {
      setToastMessage({ text: 'Simulation error: ' + err.message, type: 'error' });
    }
  };

  // Format dates
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Filter & sort games
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'originals' && g.category !== 'originals') return false;
        if (selectedCategory === 'table' && g.category !== 'table') return false;
      }
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
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

  // Sort income transactions
  const sortedIncomeTxs = useMemo(() => {
    const list = [...incomeTxs];
    if (incomeSort === 'highest') {
      return list.sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    }
    if (incomeSort === 'lowest') {
      return list.sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0));
    }
    return list; // default newest
  }, [incomeTxs, incomeSort]);

  // Calculations for financial flow visuals
  const numCredits = Number(incomeSummary.totalCredit || 0);
  const numDebits = Number(incomeSummary.totalDebit || 0);
  const totalVolume = numCredits + numDebits || 1;
  const creditPercent = Math.min(100, Math.round((numCredits / totalVolume) * 100));
  const debitPercent = Math.min(100, Math.round((numDebits / totalVolume) * 100));

  return (
    <div className="admin-root">
      {/* Dynamic Animated Aurora Glows */}
      <div className="admin-aurora-bg">
        <div className="admin-blob-1" />
        <div className="admin-blob-2" />
        <div className="admin-blob-3" />
        <div className="admin-grid-pattern" />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-container" style={{ zIndex: 9999 }}>
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Top Commander Header */}
      <header className="admin-header-wrap">
        {/* Brand & Admin Identity */}
        <div className="admin-brand-wrap">
          <Link to="/" className="admin-brand-link" title="Go to Website">
            <img
              src={LogoWebp}
              alt="Loyalty Game"
              className="admin-brand-logo"
            />
          </Link>

          <div className="admin-brand-info">
            <div className="admin-brand-title-row">
              <span className="admin-brand-title">
                Loyalty Game
              </span>
              <span className="admin-commander-badge">
                Commander
              </span>
            </div>

            <div className="admin-brand-sub-row">
              <ShieldCheck size={13} className="admin-shield-icon" />
              <span className="admin-brand-email" title={adminUser?.email || 'Super Admin'}>
                {adminUser?.email || 'Super Admin'}
              </span>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs (Health Removed) */}
        <div className="admin-nav-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <BarChart3 size={15} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('games')}
            className={`admin-tab-btn ${activeTab === 'games' ? 'active' : ''}`}
          >
            <Gamepad2 size={15} />
            <span>Games</span>
            <span className="badge-pill">{games.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`admin-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          >
            <Coins size={15} />
            <span>Ledger</span>
            <span className="badge-pill">{adminStats.totalTransactions}</span>
          </button>
        </div>

        {/* Right Tools: Live Sync, Auto-refresh toggle, Sign Out */}
        <div className="admin-header-tools">
          {/* Auto Refresh Toggle */}
          <button
            onClick={() => {
              setAutoRefresh(!autoRefresh);
              setToastMessage({
                text: !autoRefresh ? 'Auto-refresh enabled (15s interval)' : 'Auto-refresh paused',
                type: 'info',
              });
            }}
            title="Toggle 15s Auto-refresh"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: autoRefresh ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: autoRefresh ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.1)',
              color: autoRefresh ? '#00E676' : '#94a3b8',
              padding: '7px 12px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Radio size={14} className={autoRefresh ? 'pulse-dot' : ''} />
            <span>Live Auto</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Reload live database data"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: '#FFFFFF',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <RotateCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '7px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container Body */}
      <main className="admin-main-content">

        {/* ========================================================================= */}
        {/* VIEW 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ animation: 'modalFadeIn 0.3s ease-out' }}>
            {/* Top Interactive Metric KPI Cards */}
            <div className="admin-kpi-grid">
              {/* Card 1: Registered Users */}
              <div
                className="admin-card admin-card-interactive admin-kpi-card"
                onClick={() => setActiveTab('ledger')}
                title="Click to view transactions"
                style={{ padding: '22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#38bdf8',
                    }}
                  >
                    <Users size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#38bdf8',
                      background: 'rgba(56, 189, 248, 0.12)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    Decentralized
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '0 0 4px 0', fontWeight: 600 }}>
                  Registered Users
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                    {statsLoading ? '…' : adminStats.userCount.toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 600 }}>active wallets</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
                  Click to inspect user ledger →
                </div>
              </div>

              {/* Card 2: Total Transactions */}
              <div
                className="admin-card admin-card-interactive admin-kpi-card"
                onClick={() => setActiveTab('ledger')}
                title="Click to open financial ledger"
                style={{ padding: '22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(0, 230, 118, 0.15)',
                      border: '1px solid rgba(0, 230, 118, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <Activity size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#00E676',
                      background: 'rgba(0, 230, 118, 0.12)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    MongoDB Synced
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '0 0 4px 0', fontWeight: 600 }}>
                  Total Transactions
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                    {statsLoading ? '…' : adminStats.totalTransactions.toLocaleString()}
                  </h2>
                  <span style={{ fontSize: '0.78rem', color: '#00E676', fontWeight: 600 }}>logged</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
                  Credits: {adminStats.creditCount} • Debits: {adminStats.debitCount}
                </div>
              </div>

              {/* Card 3: Total Credits (Inflow / Rewards / Deposits) */}
              <div
                className="admin-card admin-card-interactive admin-kpi-card"
                onClick={() => {
                  setIncomeFilter('credit');
                  setActiveTab('ledger');
                }}
                title="Click to filter credits"
                style={{ padding: '22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(0, 230, 118, 0.15)',
                      border: '1px solid rgba(0, 230, 118, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E676',
                    }}
                  >
                    <ArrowDownLeft size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#00E676',
                      background: 'rgba(0, 230, 118, 0.12)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    Total Inflow
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '0 0 4px 0', fontWeight: 600 }}>
                  Total Credited
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#00E676', margin: 0 }}>
                    {statsLoading ? '…' : `+${adminStats.totalCredit}`}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#00E676', fontWeight: 700 }}>USDT</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
                  {adminStats.creditCount} reward & deposit events
                </div>
              </div>

              {/* Card 4: Total Debits (Entry Fees Outflow) */}
              <div
                className="admin-card admin-card-interactive admin-kpi-card"
                onClick={() => {
                  setIncomeFilter('debit');
                  setActiveTab('ledger');
                }}
                title="Click to filter debits"
                style={{ padding: '22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f87171',
                    }}
                  >
                    <ArrowUpRight size={24} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.12)',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    Match Stakes
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '0 0 4px 0', fontWeight: 600 }}>
                  Total Debited
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#f87171', margin: 0 }}>
                    {statsLoading ? '…' : `-${adminStats.totalDebit}`}
                  </h2>
                  <span style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 700 }}>USDT</span>
                </div>
                <div style={{ marginTop: '12px', fontSize: '0.74rem', color: '#64748b' }}>
                  {adminStats.debitCount} game entry deductions
                </div>
              </div>
            </div>

            {/* Interactive Flow Visualizer & Analytics Hub */}
            <div className="admin-analytics-grid">
              {/* Chart 1: Credit vs Debit Flow Breakdown */}
              <div className="admin-card" style={{ padding: '26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Financial Flow Ratio
                    </h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                      Real-time breakdown of player entry debits vs prize/deposit credits
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      padding: '4px 10px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#cbd5e1',
                      fontWeight: 600,
                    }}
                  >
                    Net: {adminStats.netEarnings} USDT
                  </span>
                </div>

                {/* Animated Horizontal Split Bar */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '8px', fontWeight: 700 }}>
                    <span style={{ color: '#00E676' }}>Credits ({creditPercent}%)</span>
                    <span style={{ color: '#f87171' }}>Debits ({debitPercent}%)</span>
                  </div>
                  <div
                    style={{
                      height: '14px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      background: 'rgba(255, 255, 255, 0.05)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div
                      style={{
                        width: `${creditPercent}%`,
                        background: 'linear-gradient(90deg, #00E676 0%, #00B050 100%)',
                        boxShadow: '0 0 12px rgba(0, 230, 118, 0.5)',
                        transition: 'width 0.8s ease',
                      }}
                    />
                    <div
                      style={{
                        width: `${debitPercent}%`,
                        background: 'linear-gradient(90deg, #f87171 0%, #dc2626 100%)',
                        boxShadow: '0 0 12px rgba(239, 68, 68, 0.5)',
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Comparative Volume Columns */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '18px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Total Prize Inflow
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00E676', marginTop: '2px' }}>
                      +{adminStats.totalCredit} <span style={{ fontSize: '0.74rem' }}>USDT</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                      Avg per credit: {(numCredits / (adminStats.creditCount || 1)).toFixed(2)} USDT
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Total Stakes Outflow
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
                      -{adminStats.totalDebit} <span style={{ fontSize: '0.74rem' }}>USDT</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                      Avg stake fee: {(numDebits / (adminStats.debitCount || 1)).toFixed(2)} USDT
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 2: Interactive Quick Actions & Simulation Command */}
              <div className="admin-card" style={{ padding: '26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                      Commander Fast Actions
                    </h3>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.82rem' }}>
                      Trigger live database test events & export ledger reports
                    </p>
                  </div>
                  <Sparkles size={20} color="#00E676" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Export Ledger CSV */}
                  <button
                    onClick={handleExportCSV}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 230, 118, 0.4)';
                      e.currentTarget.style.background = 'rgba(0, 230, 118, 0.08)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Download size={18} color="#00E676" />
                      <div style={{ textAlign: 'left' }}>
                        <div>Export Ledger to CSV</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>
                          Download complete records for audits
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight size={16} color="#64748b" />
                  </button>

                  {/* Simulate Credit Transaction */}
                  <button
                    onClick={() => handleSimulateTestTx('credit')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: 'rgba(0, 230, 118, 0.06)',
                      border: '1px solid rgba(0, 230, 118, 0.25)',
                      color: '#00E676',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(0, 230, 118, 0.14)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(0, 230, 118, 0.06)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Coins size={18} />
                      <div style={{ textAlign: 'left' }}>
                        <div>Simulate +5.00 USDT Credit</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>
                          Tests MongoDB deposit & balance credit event
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>TEST +</span>
                  </button>

                  {/* Simulate Debit Transaction */}
                  <button
                    onClick={() => handleSimulateTestTx('debit')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: '12px',
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.14)')}
                    onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Activity size={18} />
                      <div style={{ textAlign: 'left' }}>
                        <div>Simulate -1.00 USDT Match Entry</div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 400 }}>
                          Tests MongoDB game entry fee deduction
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>TEST -</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Catalog Preview Banner */}
            <div
              className="admin-card"
              style={{
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                background: 'linear-gradient(135deg, rgba(14, 18, 27, 0.95) 0%, rgba(10, 13, 20, 0.95) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(0, 230, 118, 0.15)',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E676',
                  }}
                >
                  <Gamepad2 size={24} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Game Catalog Management ({games.length} Games Active)
                  </h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.84rem' }}>
                    Configure entry pools, jackpots, threshold scores, and toggle active status.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('games')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#00E676',
                  color: '#07090e',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 230, 118, 0.3)',
                  transition: 'all 0.2s',
                }}
              >
                <span>Manage Games</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: GAMES CATALOG MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'games' && (
          <div style={{ animation: 'modalFadeIn 0.3s ease-out' }}>
            {/* Filter & Toolbar */}
            <div className="admin-toolbar-wrap">
              {/* Mobile Full-Width Search Input (Visible ONLY when mobileSearchOpen is true) */}
              {mobileSearchOpen && (
                <div className="admin-mobile-search-fullwidth">
                  <Search size={16} className="admin-search-icon" />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Search title, GZ code, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="admin-mobile-search-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="admin-mobile-search-close-btn"
                    title="Close Search"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Desktop Search Bar (Hidden on mobile via CSS) */}
              <div className="admin-desktop-search-box">
                <Search size={16} className="admin-search-icon" />
                <input
                  type="text"
                  placeholder="Search title, GZ code, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="admin-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="admin-search-clear-btn"
                    title="Clear Search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Selector Pills */}
              <div className="admin-category-pills">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'originals', label: 'Originals' },
                  { id: 'table', label: 'Table & Cards' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={selectedCategory === tab.id ? 'active' : ''}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Toolbar Actions Row: On mobile, Search Icon + Status Dropdown + Grid/Table Toggle all in the SAME ROW */}
              <div className="admin-toolbar-actions-row">
                {/* Mobile Search Icon Button */}
                {!mobileSearchOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(true);
                      setTimeout(() => mobileSearchInputRef.current?.focus(), 60);
                    }}
                    className={`admin-mobile-search-btn ${searchQuery ? 'has-query' : ''}`}
                    title="Search Games"
                  >
                    <Search size={16} />
                    {searchQuery && <span className="admin-search-badge-dot" />}
                  </button>
                )}

                {/* Status Filter Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="admin-status-select"
                >
                  <option value="all">Status: All</option>
                  <option value="active">Active Only</option>
                  <option value="paused">Paused Only</option>
                </select>

                {/* View Mode Toggle: Grid & Table */}
                <div className="admin-view-mode-toggle">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`admin-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={15} />
                    <span>Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`admin-view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    title="Table View"
                  >
                    <TableIcon size={15} />
                    <span>Table</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Games Count Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Platform Games ({filteredGames.length})
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Showing {filteredGames.length} of {games.length} total catalog games
              </span>
            </div>

            {/* Empty State */}
            {filteredGames.length === 0 && (
              <div
                className="admin-card"
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: 'rgba(14, 18, 27, 0.6)',
                  border: '1px dashed rgba(255, 255, 255, 0.15)',
                }}
              >
                <Gamepad2 size={42} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ fontSize: '1.2rem', color: '#FFFFFF', marginBottom: '6px' }}>No games match your query</h4>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '18px' }}>
                  Try resetting your search query or switching category filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStatusFilter('all');
                  }}
                  className="preset-pill-btn"
                  style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                >
                  Reset Filters
                </button>
              </div>
            )}

            {/* GRID CARDS VIEW */}
            {viewMode === 'grid' && filteredGames.length > 0 && (
              <div className="admin-games-grid">
                {filteredGames.map((game) => {
                  const isPaused = game.status === 'paused';
                  const isCopied = copiedKey === `game-${game.id}`;

                  return (
                    <div
                      key={game.id}
                      className="admin-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        opacity: isPaused ? 0.78 : 1,
                        border: isPaused ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      {/* Cover Image */}
                      <div style={{ position: 'relative', width: '100%', height: '150px', overflow: 'hidden' }}>
                        <img
                          src={game.coverUrl}
                          alt={game.title}
                          className="game-card-img-zoom"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: isPaused ? 'grayscale(85%)' : 'none',
                          }}
                          onError={(e) => {
                            e.target.src = game.logoUrl || LogoWebp;
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(14, 18, 27, 0.95) 100%)',
                          }}
                        />

                        {/* Top Badges Bar */}
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
                          <span
                            style={{
                              background: game.tagColor || '#00E676',
                              color: '#07090e',
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

                          {/* Interactive Animated Toggle Switch */}
                          <div
                            className="admin-switch-container"
                            onClick={(e) => handleToggleStatus(game.id, e)}
                            title={`Click to ${isPaused ? 'Activate' : 'Pause'} Game`}
                          >
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isPaused ? '#f87171' : '#00E676' }}>
                              {isPaused ? 'Paused' : 'Active'}
                            </span>
                            <div className={`admin-switch ${!isPaused ? 'active' : ''}`}>
                              <div className="admin-switch-handle" />
                            </div>
                          </div>
                        </div>

                        {/* Circular Logo Thumbnail */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '14px',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid rgba(0, 230, 118, 0.5)',
                            background: '#07090e',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                          }}
                        >
                          <img
                            src={game.logoUrl}
                            alt=""
                            className="admin-logo-circle"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = LogoWebp;
                            }}
                          />
                        </div>
                      </div>

                      {/* Card Content Body */}
                      <div style={{ padding: '16px 20px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ marginBottom: '10px' }}>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 2px 0', color: '#FFFFFF' }}>
                            {game.title}
                          </h4>
                          <p style={{ color: '#00E676', fontSize: '0.78rem', margin: 0, fontWeight: 700 }}>
                            {game.categoryLabel || game.category} • Code: {game.gzCode}
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

                        {/* RTP / Max Win / Players Chips */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '6px',
                            background: 'rgba(0, 0, 0, 0.35)',
                            padding: '8px 10px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            marginBottom: '14px',
                            textAlign: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase' }}>RTP</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#00E676' }}>{game.rtp || '99%'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase' }}>Max Win</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fbbf24' }}>{game.maxWin || '1000x'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase' }}>Players</div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1' }}>{game.players || '1,000'}</div>
                          </div>
                        </div>

                        {/* Pool Metrics Display */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '6px',
                            background: 'rgba(0, 230, 118, 0.05)',
                            border: '1px solid rgba(0, 230, 118, 0.2)',
                            padding: '10px',
                            borderRadius: '12px',
                            marginBottom: '16px',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                              Entry Pool
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFFFFF' }}>
                              {game.entryPool || '1.00'} <span style={{ fontSize: '0.68rem', color: '#00E676' }}>USDT</span>
                            </span>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                              Prize Pool
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#00E676' }}>
                              {game.prizePool || '100.00'} <span style={{ fontSize: '0.68rem' }}>USDT</span>
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.64rem', color: '#FFB300', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>
                              Win Score
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#FFB300' }}>
                              {game.thresholdScore || '500'} <span style={{ fontSize: '0.68rem' }}>PTS</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {/* Test Play */}
                            <button
                              onClick={() => {
                                setPreviewGame(game);
                                setIframeKey((prev) => prev + 1);
                              }}
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

                            {/* Configure Pools */}
                            <button
                              onClick={(e) => handleOpenConfig(game, e)}
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
                            {/* Inspect Specs */}
                            <button
                              onClick={() => setInspectGame(game)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: '#cbd5e1',
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
                              <span>Inspect Specs</span>
                            </button>

                            {/* Copy Embed URL */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const url = game.embedUrl || `https://gamescdn.gamezop.com/_game-files/${game.gzCode}/index.html`;
                                copyToClipboard(url, `game-${game.id}`, `Copied URL for "${game.title}"`);
                              }}
                              title="Copy direct GameZop embed URL"
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
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

            {/* TABLE VIEW */}
            {viewMode === 'table' && filteredGames.length > 0 && (
              <div
                className="admin-card admin-table-responsive"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'rgba(0, 0, 0, 0.4)',
                          color: '#94a3b8',
                          fontSize: '0.74rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        <th style={{ padding: '14px 18px' }}>Game</th>
                        <th style={{ padding: '14px 18px' }}>GZ Code</th>
                        <th style={{ padding: '14px 18px' }}>Category</th>
                        <th style={{ padding: '14px 18px' }}>RTP</th>
                        <th style={{ padding: '14px 18px' }}>Max Win</th>
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
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              transition: 'background 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                  src={game.logoUrl}
                                  alt=""
                                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                                  onError={(e) => {
                                    e.target.src = LogoWebp;
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, color: '#FFFFFF' }}>{game.title}</div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ID: {game.id}</div>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#94a3b8' }}>
                              {game.gzCode}
                            </td>

                            <td style={{ padding: '12px 18px', color: '#cbd5e1' }}>
                              {game.categoryLabel}
                            </td>

                            <td style={{ padding: '12px 18px', color: '#00E676', fontWeight: 700 }}>
                              {game.rtp || '99%'}
                            </td>

                            <td style={{ padding: '12px 18px', color: '#fbbf24', fontWeight: 700 }}>
                              {game.maxWin || '1000x'}
                            </td>

                            <td style={{ padding: '12px 18px', fontWeight: 700, color: '#FFFFFF' }}>
                              {game.entryPool || '1.00'} <span style={{ fontSize: '0.7rem', color: '#00E676' }}>USDT</span>
                            </td>

                            <td style={{ padding: '12px 18px', fontWeight: 800, color: '#00E676' }}>
                              {game.prizePool || '100.00'} <span style={{ fontSize: '0.7rem' }}>USDT</span>
                            </td>

                            <td style={{ padding: '12px 18px', fontWeight: 800, color: '#FFB300' }}>
                              {game.thresholdScore || '500'} <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>pts</span>
                            </td>

                            <td style={{ padding: '12px 18px' }}>
                              <div
                                className="admin-switch-container"
                                onClick={(e) => handleToggleStatus(game.id, e)}
                                title={`Click to ${isPaused ? 'Activate' : 'Pause'} Game`}
                              >
                                <div className={`admin-switch ${!isPaused ? 'active' : ''}`}>
                                  <div className="admin-switch-handle" />
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  onClick={() => {
                                    setPreviewGame(game);
                                    setIframeKey((prev) => prev + 1);
                                  }}
                                  title="Test Play in Admin"
                                  style={{
                                    background: 'rgba(0, 230, 118, 0.15)',
                                    border: '1px solid rgba(0, 230, 118, 0.3)',
                                    color: '#00E676',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Play size={12} fill="#00E676" />
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
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <SlidersHorizontal size={12} />
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
                                  <Eye size={13} />
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FINANCIAL LEDGER & INCOME DETAILS */}
        {/* ========================================================================= */}
        {activeTab === 'ledger' && (
          <div style={{ animation: 'modalFadeIn 0.3s ease-out' }}>
            {/* Header & Filter Controls */}
            <div className="admin-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="admin-ledger-header">
                <div className="admin-ledger-title-wrap">
                  <div className="admin-ledger-title-icon">
                    <Coins size={24} />
                  </div>
                  <div>
                    <h2 className="admin-ledger-title">
                      Complete Income & Debit Ledger
                    </h2>
                    <p className="admin-ledger-subtitle">
                      Every transaction automatically recorded in MongoDB across all player wallets
                    </p>
                  </div>
                </div>

                {/* Controls: Search + Dropdown (2:1 ratio in one row) & Filter (Full Width) */}
                <div className="admin-ledger-controls">
                  {/* Row 1: Search & Dropdown (2:1 ratio in one row) */}
                  <div className="admin-ledger-search-row">
                    <div className="admin-ledger-search-wrap">
                      <Search size={15} className="admin-ledger-search-icon" />
                      <input
                        type="text"
                        placeholder="Search wallet, game, ref ID..."
                        value={incomeSearch}
                        onChange={(e) => handleIncomeSearchChange(e.target.value)}
                        className="admin-ledger-search-input"
                      />
                    </div>

                    <select
                      value={incomeSort}
                      onChange={(e) => setIncomeSort(e.target.value)}
                      className="admin-ledger-sort-select"
                    >
                      <option value="newest">Sort: Newest</option>
                      <option value="highest">Sort: Highest</option>
                      <option value="lowest">Sort: Lowest</option>
                    </select>
                  </div>

                  {/* Row 2: Filter Tabs (Full Width) */}
                  <div className="admin-ledger-filter-row">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'credit', label: 'Credits (+)' },
                      { id: 'debit', label: 'Debits (-)' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleIncomeFilterChange(tab.id)}
                        className={`admin-ledger-filter-btn ${incomeFilter === tab.id ? 'active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Stats Row (Two cards per row on mobile) */}
              <div className="admin-ledger-stats-grid">
                <div className="admin-ledger-stat-card stat-credit">
                  <div className="admin-ledger-stat-label">
                    Credits Inflow
                  </div>
                  <div className="admin-ledger-stat-val val-credit">
                    +{incomeSummary.totalCredit} <span className="stat-cur">USDT</span>
                  </div>
                </div>

                <div className="admin-ledger-stat-card stat-debit">
                  <div className="admin-ledger-stat-label">
                    Debits Outflow
                  </div>
                  <div className="admin-ledger-stat-val val-debit">
                    -{incomeSummary.totalDebit} <span className="stat-cur">USDT</span>
                  </div>
                </div>

                <div className="admin-ledger-stat-card stat-net">
                  <div className="admin-ledger-stat-label">
                    Net Flow
                  </div>
                  <div className="admin-ledger-stat-val val-net">
                    {incomeSummary.netEarnings} <span className="stat-cur">USDT</span>
                  </div>
                </div>

                <div className="admin-ledger-stat-card stat-count">
                  <div className="admin-ledger-stat-label">
                    Transactions Count
                  </div>
                  <div className="admin-ledger-stat-val val-count">
                    {incomeSummary.totalTransactions} <span className="stat-cur">records</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="admin-card admin-table-responsive" style={{ borderRadius: '18px', overflow: 'hidden' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
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
                      <th style={{ padding: '12px 16px' }}>Type</th>
                      <th style={{ padding: '12px 16px' }}>Amount</th>
                      <th style={{ padding: '12px 16px' }}>Wallet Address</th>
                      <th style={{ padding: '12px 16px' }}>Description</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>Reference ID</th>
                      <th style={{ padding: '12px 16px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeLoading ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          <RotateCw size={24} className="spin-anim" style={{ margin: '0 auto 8px auto', display: 'block', color: '#00E676' }} />
                          Loading ledger from database...
                        </td>
                      </tr>
                    ) : sortedIncomeTxs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No transactions found in database for this filter.
                        </td>
                      </tr>
                    ) : (
                      sortedIncomeTxs.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        const isCopied = copiedKey === `tx-${tx.referenceId}`;

                        return (
                          <tr
                            key={tx._id || tx.referenceId}
                            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  background: isCredit ? 'rgba(0, 230, 118, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isCredit ? '#00E676' : '#f87171',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: '10px',
                                  textTransform: 'uppercase',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                {isCredit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                <span>{isCredit ? 'Credit' : 'Debit'}</span>
                              </span>
                            </td>

                            <td
                              style={{
                                padding: '12px 16px',
                                fontWeight: 800,
                                color: isCredit ? '#00E676' : '#f87171',
                                whiteSpace: 'nowrap',
                                fontSize: '0.9rem',
                              }}
                            >
                              {isCredit ? '+' : '-'}
                              {Number(tx.amount || 0).toFixed(2)} USDT
                            </td>

                            <td
                              style={{
                                padding: '12px 16px',
                                fontFamily: 'monospace',
                                color: '#cbd5e1',
                                fontSize: '0.78rem',
                              }}
                            >
                              {tx.walletAddress
                                ? `${tx.walletAddress.slice(0, 6)}...${tx.walletAddress.slice(-4)}`
                                : '—'}
                            </td>

                            <td style={{ padding: '12px 16px', color: '#FFFFFF', maxWidth: '280px' }}>
                              {tx.description || `${tx.gameTitle || 'Transaction'}`}
                            </td>

                            <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem' }}>
                              <span
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {(tx.category || tx.type || '').replace(/_/g, ' ')}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.76rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{tx.referenceId}</span>
                                <button
                                  onClick={() => copyToClipboard(tx.referenceId, `tx-${tx.referenceId}`, 'Copied reference ID')}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: isCopied ? '#00E676' : '#64748b',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                              {formatDateTime(tx.createdAt)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Footer: CSV Button below table */}
            <div className="admin-ledger-table-footer">
              <div className="admin-ledger-footer-info">
                Showing <span className="highlight">{sortedIncomeTxs.length}</span> of{' '}
                <span className="highlight">{incomeTxs.length}</span> transactions
              </div>

              <button
                onClick={handleExportCSV}
                className="admin-ledger-csv-btn"
                title="Export all transactions to CSV file"
              >
                <Download size={15} />
                <span>Export to CSV</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: TEST PLAY GAME MODAL WITH RELOAD & FULLSCREEN */}
      {/* ========================================================================= */}
      {previewGame && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewGame(null)}>
          <div
            className="admin-modal-dialog admin-card admin-preview-dialog-responsive"
            style={{
              width: '100%',
              maxWidth: '980px',
              height: '88vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 20px',
                background: 'rgba(14, 18, 27, 0.95)',
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
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.src = LogoWebp;
                  }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {previewGame.title}
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: '#00E676' }}>
                    Admin Interactive Test Session • Code: {previewGame.gzCode}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Reload Iframe */}
                <button
                  onClick={() => setIframeKey((prev) => prev + 1)}
                  title="Reload Game Frame"
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
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCw size={13} />
                  <span>Reload</span>
                </button>

                {/* Popout fullscreen */}
                <Link
                  to={`/play/${previewGame.id}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(0, 230, 118, 0.15)',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                    color: '#00E676',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  <ExternalLink size={13} />
                  <span>Open Full Game</span>
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
                key={iframeKey}
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
      {/* MODAL 2: CONFIGURE GAME POOLS MODAL WITH INTERACTIVE PRESETS */}
      {/* ========================================================================= */}
      {configuringGame && (
        <div className="admin-modal-backdrop" onClick={() => setConfiguringGame(null)}>
          <div
            className="admin-modal-dialog admin-card admin-modal-dialog-responsive"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '28px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(0, 230, 118, 0.15)',
                    border: '1px solid rgba(0, 230, 118, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E676',
                  }}
                >
                  <SlidersHorizontal size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Game Configuration
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    {configuringGame.title} ({configuringGame.gzCode})
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

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Entry Pool Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Entry Pool (USDT)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Player match stake fee</span>
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
                      border: '1px solid rgba(255, 255, 255, 0.12)',
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

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['0.50', '1.00', '2.00', '5.00', '10.00', '25.00', '50.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigEntryPool(preset)}
                      className={`preset-pill-btn ${configEntryPool === preset ? 'active' : ''}`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prize Pool Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Prize Pool (USDT)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#00E676' }}>Jackpot reward pool</span>
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
                      border: '1px solid rgba(255, 255, 255, 0.12)',
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

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['50.00', '100.00', '250.00', '500.00', '1000.00', '2500.00', '5000.00'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigPrizePool(preset)}
                      className={`preset-pill-btn ${configPrizePool === preset ? 'active' : ''}`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Threshold Win Score Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Threshold Win Score (Points)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#FFB300' }}>Score required to claim prize</span>
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
                      border: '1px solid rgba(255, 255, 255, 0.12)',
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

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {['100', '250', '500', '1000', '2500', '5000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setConfigThresholdScore(preset)}
                      className={`preset-pill-btn ${configThresholdScore === preset ? 'active' : ''}`}
                    >
                      {preset} pts
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Multiplier Ratio */}
              {parseFloat(configEntryPool) > 0 && parseFloat(configPrizePool) > 0 && (
                <div
                  style={{
                    background: 'rgba(0, 230, 118, 0.08)',
                    border: '1px solid rgba(0, 230, 118, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Calculated Jackpot Multiplier:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#00E676' }}>
                    {(parseFloat(configPrizePool) / parseFloat(configEntryPool)).toFixed(1)}x Multiplier
                  </span>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setConfiguringGame(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: '#00E676',
                    color: '#07090e',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 22px',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 230, 118, 0.3)',
                  }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INSPECT GAME SPECS MODAL */}
      {/* ========================================================================= */}
      {inspectGame && (
        <div className="admin-modal-backdrop" onClick={() => setInspectGame(null)}>
          <div
            className="admin-modal-dialog admin-card admin-modal-dialog-responsive"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
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
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>GZ Code: {inspectGame.gzCode}</span>
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

            {/* Technical Specs */}
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
                  onClick={() => {
                    const url = inspectGame.embedUrl || `https://gamescdn.gamezop.com/_game-files/${inspectGame.gzCode}/index.html`;
                    copyToClipboard(url, `inspect-${inspectGame.id}`, 'Copied embed URL');
                  }}
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
    </div>
  );
}
