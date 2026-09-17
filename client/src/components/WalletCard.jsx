import React from 'react';
import { Loader2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function WalletCard({
  wallet,
  isConnecting,
  isDetected,
  onConnect,
  onDemoConnect,
}) {
  const getWalletIcon = (name) => {
    switch (name) {
      case 'MetaMask':
        return (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M29.07 16.03l-2.07-8.15-5.96 4.39L29.07 16.03z" fill="#E2761B" stroke="#E2761B"/>
            <path d="M2.93 16.03l2.07-8.15 5.96 4.39L2.93 16.03z" fill="#E4761B" stroke="#E4761B"/>
            <path d="M24.78 22.84l-3.52 5.16 7.15-1.99.23-7.51-3.86 4.34z" fill="#E4761B" stroke="#E4761B"/>
            <path d="M7.22 22.84l3.52 5.16-7.15-1.99-.23-7.51 3.86 4.34z" fill="#E4761B" stroke="#E4761B"/>
            <path d="M10.96 12.27L8.9 7.88l-5.97 8.15 7.02 5.76.71-3.11-.7-6.41z" fill="#D7C1B3" stroke="#D7C1B3"/>
            <path d="M21.04 12.27l2.06-4.39 5.97 8.15-7.02 5.76-.71-3.11.7-6.41z" fill="#D7C1B3" stroke="#D7C1B3"/>
            <path d="M10.74 28l5.26 2 5.26-2-1.07-4.16H11.81L10.74 28z" fill="#161616" stroke="#161616"/>
            <path d="M16 22.19l4.49-1.9-4.49-8.02-4.49 8.02 4.49 1.9z" fill="#763D16" stroke="#763D16"/>
          </svg>
        );
      case 'Trust Wallet':
        return (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 3L6 8v9c0 7.5 4.3 14.5 10 16 5.7-1.5 10-8.5 10-16V8L16 3z"
              fill="#0500FF"
            />
            <path
              d="M16 6.5l7 3.5v7c0 5.5-3 10.5-7 12-4-1.5-7-6.5-7-12v-7l7-3.5z"
              fill="#ffffff"
            />
          </svg>
        );
      case 'SafePal':
        return (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#7A34EC" />
            <path
              d="M10 9h12c1.1 0 2 .9 2 2v2H8v-2c0-1.1.9-2 2-2zM8 15h16v6c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-6zm11 3a1 1 0 100 2 1 1 0 000-2z"
              fill="#ffffff"
            />
          </svg>
        );
      case 'Rabby Wallet':
        return (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#8697FF" />
            <circle cx="16" cy="16" r="8" fill="#ffffff" />
            <circle cx="13" cy="14" r="1.5" fill="#3B4874" />
            <circle cx="19" cy="14" r="1.5" fill="#3B4874" />
            <path d="M14.5 18c.8.8 2.2.8 3 0" stroke="#3B4874" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );
      case 'Coinbase Wallet':
        return (
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#0052FF" />
            <circle cx="16" cy="16" r="9" fill="#ffffff" />
            <rect x="13" y="13" width="6" height="6" rx="1.5" fill="#0052FF" />
          </svg>
        );
      default:
        return <ShieldCheck size={28} color="#8b5cf6" />;
    }
  };

  return (
    <div className={`wallet-card ${isConnecting ? 'active' : ''}`}>
      <div className="wallet-info">
        <div className="wallet-icon-box">{getWalletIcon(wallet.name)}</div>
        <div className="wallet-details">
          <div className="wallet-name-row">
            <h4>{wallet.name}</h4>
            <span className="wallet-badge">
              {wallet.badge}
            </span>
          </div>
          <p className="wallet-desc">{wallet.description}</p>
        </div>
      </div>

      <div className="wallet-actions">
        {isConnecting ? (
          <button className="btn-primary wallet-connect-btn" disabled>
            <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Connecting...</span>
          </button>
        ) : (
          <>
            <button
              onClick={() => onConnect(wallet.name)}
              className="btn-primary wallet-connect-btn"
            >
              <span>Connect</span>
              <ArrowRight size={14} />
            </button>

            <button
              onClick={() => onDemoConnect(wallet.name)}
              title="Instant demo connection using cryptographic ethers.js wallet"
              className="btn-secondary wallet-demo-btn"
            >
              <Sparkles size={13} color="#00E676" />
              <span>Demo</span>
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
