import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/Navbar';
import Toast from '../components/Toast';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Trophy,
  Gamepad2,
  Calendar,
  Clock,
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';

export default function IncomeDetails() {
  const { user, updateBalance } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    summary: {
      totalCredit: '0.00',
      totalDebit: '0.00',
      netEarnings: '0.00',
      isProfit: true,
      creditCount: 0,
      debitCount: 0,
      totalTransactions: 0,
    },
    transactions: [],
  });

  const [filterType, setFilterType] = useState('all'); // 'all' | 'credit' | 'debit' | 'cut'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch income details from API
  const fetchIncomeDetails = async () => {
    if (!user?.walletAddress) return;
    setLoading(true);

    try {
      const res = await api.getIncomeDetails(user.walletAddress);
      if (res.success) {
        setData({
          summary: res.summary,
          transactions: res.transactions || [],
        });
        if (res.currentBalance && user.usdtBalance !== res.currentBalance) {
          updateBalance(res.currentBalance);
        }
      }
    } catch (err) {
      console.error('[Income Details Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeDetails();
  }, [user?.walletAddress]);

  useEffect(() => {
    document.title = 'Income Details | Loyalty Game';
  }, []);

  // Copy transaction reference ID
  const copyTxId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setToastMessage({ text: `Copied ID: ${id}`, type: 'success' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 25% platform-cut ledger: prize rewards where a cut was taken
  const cutTransactions = useMemo(() => {
    return (data.transactions || []).filter((t) => Number(t.deductionAmount || 0) > 0);
  }, [data.transactions]);

  const cutTotals = useMemo(() => {
    let gross = 0;
    let cut = 0;
    let net = 0;
    cutTransactions.forEach((t) => {
      gross += Number(t.grossReward || t.amount || 0);
      cut += Number(t.deductionAmount || 0);
      net += Number(t.amount || 0);
    });
    return {
      count: cutTransactions.length,
      gross: gross.toFixed(2),
      cut: cut.toFixed(2),
      net: net.toFixed(2),
    };
  }, [cutTransactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    let list = data.transactions || [];

    if (filterType === 'cut') {
      list = cutTransactions;
    } else if (filterType !== 'all') {
      list = list.filter((t) => t.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.gameTitle && t.gameTitle.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.referenceId && t.referenceId.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [data.transactions, cutTransactions, filterType, searchQuery]);

  // Format date helper
  const formatTxTime = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to extract clean display info from transaction data
  const formatCardData = (tx) => {
    const isCredit = tx.type === 'credit';
    const desc = tx.description || '';

    // Check for score pattern: e.g. "(Score: 10 >= 10 PTS)" or "(Score: 120 >= 100 PTS)"
    const scoreMatch = desc.match(/\(Score:\s*([^)]+)\)/i);
    const scoreText = scoreMatch ? scoreMatch[1].replace('>=', '≥') : null;

    // Clean up description without the score clause
    let cleanDesc = desc.replace(/\(Score:\s*[^)]+\)/i, '').trim();

    // Determine primary display title and action/subtitle
    let mainTitle = tx.gameTitle || '';
    let categoryPill = '';

    if (!mainTitle) {
      if (cleanDesc.includes(' - ')) {
        const parts = cleanDesc.split(' - ');
        categoryPill = parts[0].trim();
        mainTitle = parts.slice(1).join(' - ').trim();
      } else {
        mainTitle = cleanDesc || (isCredit ? 'Prize Pool Credit' : 'Game Entry Fee');
      }
    } else {
      if (cleanDesc.includes(' - ')) {
        categoryPill = cleanDesc.split(' - ')[0].trim();
      }
    }

    // Standardize badge tag
    let badgeText = categoryPill || (tx.category ? tx.category.replace('_', ' ') : (isCredit ? 'PRIZE REWARD' : 'GAME ENTRY'));
    if (tx.category === 'prize_reward') badgeText = 'PRIZE REWARD';
    else if (tx.category === 'game_entry') badgeText = 'ENTRY FEE';
    else if (tx.category === 'deposit') badgeText = 'DEPOSIT';
    else if (tx.category === 'withdrawal') badgeText = 'WITHDRAWAL';

    return {
      isCredit,
      mainTitle,
      badgeText: badgeText.toUpperCase(),
      scoreText,
      amount: Number(tx.amount || 0).toFixed(2),
      grossReward: tx.grossReward ? Number(tx.grossReward).toFixed(2) : null,
      deductionAmount: tx.deductionAmount ? Number(tx.deductionAmount).toFixed(2) : null,
      netReward: tx.netReward ? Number(tx.netReward).toFixed(2) : null,
      balanceAfter: Number(tx.balanceAfter || 0).toFixed(2),
      referenceId: tx.referenceId || '',
      createdAt: tx.createdAt,
    };
  };

  const netNum = parseFloat(data.summary?.netEarnings || '0');

  return (
    <div className="website-fullscreen-overlay">
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Same Navbar as /games page (with Games | Income Details tabs) */}
      <Navbar onCopyToast={(msg) => setToastMessage({ text: msg, type: 'success' })} />

      <main
        className="no-scrollbar income-main"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '98px 32px 80px 32px',
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
        }}
      >
          {/* Header Section */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
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
                  fontWeight: 700,
                  marginBottom: '10px',
                }}
              >
                <TrendingUp size={13} />
                <span>Financial Ledger &amp; Cash Flow</span>
              </div>
              <h1 className="income-title" style={{ fontSize: '2.2rem', marginBottom: '6px', color: '#FFFFFF' }}>
                Income &amp; <span className="gradient-text">Activity Details</span>
              </h1>
              <p style={{ color: '#A3A3A3', fontSize: '0.92rem', margin: 0 }}>
                Track every credit (prize payouts, earnings, deposits) and debit (game entry fees, bets) saved in database.
              </p>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div
            className="income-stats-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '18px',
              marginBottom: '32px',
            }}
          >
            {/* Card 1: Total Credits (Income) */}
            <div
              className="glass-panel"
              style={{
                padding: '22px',
                background: 'linear-gradient(145deg, rgba(10, 24, 16, 0.85) 0%, rgba(8, 14, 11, 0.95) 100%)',
                border: '1px solid rgba(0, 230, 118, 0.35)',
                borderRadius: '16px',
                boxShadow: '0 0 25px rgba(0, 230, 118, 0.12)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Credits (Income)
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0, 230, 118, 0.15)',
                    border: '1px solid rgba(0, 230, 118, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E676',
                  }}
                >
                  <ArrowDownLeft size={18} />
                </div>
              </div>
              <div className="income-stat-value" style={{ fontSize: '1.9rem', fontWeight: 800, color: '#00E676', letterSpacing: '-0.02em' }}>
                +{data.summary.totalCredit} <span style={{ fontSize: '1rem', color: '#39FF88', fontWeight: 600 }}>LXT</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px' }}>
                {data.summary.creditCount} Credit Transaction{data.summary.creditCount !== 1 ? 's' : ''} (Wins &amp; Deposits)
              </div>
            </div>

            {/* Card 2: Total Debits (Expenses) */}
            <div
              className="glass-panel"
              style={{
                padding: '22px',
                background: 'linear-gradient(145deg, rgba(28, 12, 14, 0.85) 0%, rgba(14, 8, 9, 0.95) 100%)',
                border: '1px solid rgba(255, 82, 82, 0.35)',
                borderRadius: '16px',
                boxShadow: '0 0 25px rgba(255, 82, 82, 0.10)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Debits (Deducted)
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(255, 82, 82, 0.15)',
                    border: '1px solid rgba(255, 82, 82, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF5252',
                  }}
                >
                  <ArrowUpRight size={18} />
                </div>
              </div>
              <div className="income-stat-value" style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FF5252', letterSpacing: '-0.02em' }}>
                -{data.summary.totalDebit} <span style={{ fontSize: '1rem', color: '#FF8A80', fontWeight: 600 }}>LXT</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px' }}>
                {data.summary.debitCount} Debit Transaction{data.summary.debitCount !== 1 ? 's' : ''} (Game Entry Fees)
              </div>
            </div>

            {/* Card 3: Net Earnings (PnL) */}
            <div
              className="glass-panel"
              style={{
                padding: '22px',
                background:
                  netNum >= 0
                    ? 'linear-gradient(145deg, rgba(12, 26, 18, 0.85) 0%, rgba(8, 16, 12, 0.95) 100%)'
                    : 'linear-gradient(145deg, rgba(26, 14, 16, 0.85) 0%, rgba(14, 9, 10, 0.95) 100%)',
                border: netNum >= 0 ? '1px solid rgba(0, 230, 118, 0.35)' : '1px solid rgba(255, 179, 0, 0.35)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Net PnL (Profit / Loss)
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: netNum >= 0 ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 179, 0, 0.15)',
                    border: netNum >= 0 ? '1px solid rgba(0, 230, 118, 0.4)' : '1px solid rgba(255, 179, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: netNum >= 0 ? '#00E676' : '#FFB300',
                  }}
                >
                  <Trophy size={18} />
                </div>
              </div>
              <div
                className="income-stat-value"
                style={{
                  fontSize: '1.9rem',
                  fontWeight: 800,
                  color: netNum >= 0 ? '#00E676' : '#FFB300',
                  letterSpacing: '-0.02em',
                }}
              >
                {netNum >= 0 ? `+${data.summary.netEarnings}` : data.summary.netEarnings}{' '}
                <span style={{ fontSize: '1rem', color: '#FFFFFF', fontWeight: 600 }}>LXT</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px' }}>
                {netNum >= 0 ? '🟢 Profitable Account' : '🟡 Net Negative (Play to recover)'}
              </div>
            </div>

            {/* Card 4: Current Live LXT Balance */}
            <div
              className="glass-panel"
              style={{
                padding: '22px',
                background: 'linear-gradient(145deg, rgba(16, 20, 30, 0.85) 0%, rgba(10, 12, 18, 0.95) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: '#A3A3A3', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Available LXT Balance
                </span>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#38BDF8',
                  }}
                >
                  <Wallet size={18} />
                </div>
              </div>
              <div className="income-stat-value" style={{ fontSize: '1.9rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                {user?.usdtBalance || '0.00'} <span style={{ fontSize: '1rem', color: '#38BDF8', fontWeight: 600 }}>LXT</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
                {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Connected'}
              </div>
            </div>
          </div>

          {/* Activity Ledger Container */}
          <div
            className="glass-panel income-ledger"
            style={{
              padding: '24px',
              background: '#0D110F',
              border: '1px solid #1E2922',
              borderRadius: '16px',
            }}
          >
            {/* Filter Tabs & Search */}
            <div
              className="income-controls"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '22px',
              }}
            >
              {/* Type Filter Buttons */}
              <div className="income-tabs" style={{ display: 'flex', gap: '8px', background: '#080A09', padding: '4px', borderRadius: '10px', border: '1px solid #19221C' }}>
                <button
                  onClick={() => setFilterType('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: filterType === 'all' ? '#00E676' : 'transparent',
                    color: filterType === 'all' ? '#000' : '#A3A3A3',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  All ({data.summary.totalTransactions})
                </button>
                <button
                  onClick={() => setFilterType('credit')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: filterType === 'credit' ? '#00E676' : 'transparent',
                    color: filterType === 'credit' ? '#000' : '#A3A3A3',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🟢 Credits ({data.summary.creditCount})
                </button>
                <button
                  onClick={() => setFilterType('debit')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: filterType === 'debit' ? '#FF5252' : 'transparent',
                    color: filterType === 'debit' ? '#fff' : '#A3A3A3',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🔴 Debits ({data.summary.debitCount})
                </button>
                <button
                  onClick={() => setFilterType('cut')}
                  title="Prize rewards with 25% platform cut"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: filterType === 'cut' ? 'none' : '1px solid rgba(255, 179, 0, 0.4)',
                    background: filterType === 'cut' ? '#FFB300' : 'rgba(255, 179, 0, 0.08)',
                    color: filterType === 'cut' ? '#000' : '#FFB300',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✂️ 25% Cut ({cutTotals.count})
                </button>
              </div>

              {/* Search Box */}
              <div className="income-search" style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={14} color="#737373" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search by game, description or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#080A09',
                    border: '1px solid #1E2922',
                    borderRadius: '10px',
                    padding: '8px 12px 8px 34px',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 25% Cut summary strip (visible on 25% Cut tab) */}
            {filterType === 'cut' && (
              <div
                className="income-cut-strip"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px 20px',
                  alignItems: 'center',
                  background: 'rgba(255, 179, 0, 0.07)',
                  border: '1px solid rgba(255, 179, 0, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#FFE082',
                }}
              >
                <span>✂️ {cutTotals.count} prize{cutTotals.count !== 1 ? 's' : ''} with 25% cut</span>
                <span>Gross: <strong style={{ color: '#FFFFFF' }}>{cutTotals.gross} LXT</strong></span>
                <span>Platform cut: <strong style={{ color: '#FFB300' }}>-{cutTotals.cut} LXT</strong></span>
                <span>You received: <strong style={{ color: '#00E676' }}>+{cutTotals.net} LXT</strong></span>
              </div>
            )}

            {/* Transactions List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A3A3A3' }}>
                <div className="gz-spinner" style={{ margin: '0 auto 16px auto' }} />
                <p>Loading database records...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  border: '1px dashed #1E2922',
                }}
              >
                <Gamepad2 size={42} color="#00E676" style={{ margin: '0 auto 12px auto', opacity: 0.8 }} />
                <h3 style={{ color: '#FFFFFF', fontSize: '1.1rem', marginBottom: '6px' }}>No Transactions Found</h3>
                <p style={{ color: '#737373', fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 16px auto' }}>
                  {searchQuery
                    ? 'No transactions matching your search query.'
                    : filterType === 'cut'
                    ? 'No 25% platform cuts yet — win a prize pool and the cut will appear here!'
                    : 'Start playing games or enter prize pools to generate credits and debits!'}
                </p>
                <Link
                  to="/games"
                  className="fullscreen-hud-btn"
                  style={{
                    display: 'inline-flex',
                    background: '#00E676',
                    color: '#000',
                    borderColor: '#00E676',
                    fontWeight: 800,
                  }}
                >
                  <Gamepad2 size={14} />
                  <span>Go to Games Lobby</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTransactions.map((tx) => {
                  const card = formatCardData(tx);
                  const isCredit = card.isCredit;

                  return (
                    <div
                      key={tx._id || tx.referenceId}
                      className={`income-card ${isCredit ? 'credit-card' : 'debit-card'}`}
                    >
                      {/* Top Tier: Left (Avatar + Game Name + Badges) & Right (Amount + Balance) */}
                      <div className="income-card-top">
                        <div className="income-card-left">
                          {/* Circular Status Avatar */}
                          <div className={`income-avatar ${isCredit ? 'credit' : 'debit'}`}>
                            {isCredit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>

                          <div className="income-info-block">
                            <div className="income-item-title" title={card.mainTitle}>
                              {card.mainTitle}
                            </div>

                            <div className="income-badge-row">
                              <span className={`income-status-badge ${isCredit ? 'credit' : 'debit'}`}>
                                <span className="badge-pulse-dot" />
                                {card.badgeText}
                              </span>

                              {card.scoreText && (
                                <span className="income-score-badge">
                                  <Trophy size={11} className="trophy-icon" />
                                  <span>Score: {card.scoreText}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Balance */}
                        <div className="income-card-right">
                          <div className={`income-amount ${isCredit ? 'credit' : 'debit'}`}>
                            {isCredit ? `+${card.amount}` : `-${card.amount}`}
                            <span className="income-currency">LXT</span>
                          </div>
                          {card.deductionAmount && (
                            <div className="income-platform-cut" style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, margin: '2px 0' }}>
                              -25% Platform Cut: -{card.deductionAmount} LXT (Gross: {card.grossReward} LXT)
                            </div>
                          )}
                          <div className="income-balance-after">
                            <span className="bal-lbl">Bal after:</span>
                            <span className="bal-val">{card.balanceAfter} LXT</span>
                          </div>
                        </div>
                      </div>

                      {/* Thin Separator Line */}
                      <div className="income-card-divider" />

                      {/* Bottom Tier: Timestamp & Copyable Ref Pill */}
                      <div className="income-card-bottom">
                        <div className="income-timestamp">
                          <Clock size={12} />
                          <span>{formatTxTime(card.createdAt)}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => copyTxId(card.referenceId)}
                          className={`income-ref-hash-btn ${copiedId === card.referenceId ? 'copied' : ''}`}
                          title="Click to copy Transaction Reference ID"
                        >
                          <span className="ref-prefix">TX:</span>
                          <span className="ref-code">{card.referenceId}</span>
                          {copiedId === card.referenceId ? (
                            <span className="copied-tag">
                              <Check size={11} /> Copied
                            </span>
                          ) : (
                            <Copy size={11} className="copy-icon" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </main>
    </div>
  );
}
