import React, { useState } from 'react';
import { RefreshCw, ExternalLink, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { shortenAddress } from '../services/web3Service';

export default function UsdtCard({
  balance,
  walletAddress,
  chainId = 1,
  onRefresh,
  isLoading,
}) {
  const [isRotating, setIsRotating] = useState(false);

  const handleRefreshClick = async () => {
    setIsRotating(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => setIsRotating(false), 800);
  };

  const getExplorerUrl = (address, chainId) => {
    if (chainId === 56) return `https://bscscan.com/address/${address}`;
    if (chainId === 137) return `https://polygonscan.com/address/${address}`;
    if (chainId === 11155111) return `https://sepolia.etherscan.io/address/${address}`;
    return `https://etherscan.io/address/${address}`;
  };

  return (
    <div className="usdt-hero-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="usdt-tag">
          {/* Tether USDT Logo Icon */}
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#26A17B" />
            <path
              d="M17.9 17.5c-.1 0-1 .1-1.9.1s-1.8 0-1.9-.1c-4.4-.2-7.7-1-7.7-2s3.3-1.8 7.7-2c.1 0 1-.1 1.9-.1s1.8 0 1.9.1c4.4.2 7.7 1 7.7 2s-3.3 1.8-7.7 2zm0-4.6v-2.3h5.7V7H8.4v3.6h5.7v2.3c-5 .2-8.8 1.3-8.8 2.6s3.8 2.4 8.8 2.6v7.3h3.8v-7.3c5-.2 8.8-1.3 8.8-2.6s-3.8-2.4-8.8-2.6z"
              fill="#ffffff"
            />
          </svg>
          <span>ERC-20 USDT BALANCE</span>
        </div>

        <button
          onClick={handleRefreshClick}
          disabled={isLoading}
          className="btn-ghost"
          style={{
            fontSize: '0.8rem',
            color: '#00E676',
            background: 'rgba(0, 230, 118, 0.10)',
            border: '1px solid rgba(0, 230, 118, 0.3)',
            borderRadius: '20px',
            padding: '6px 14px',
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: isRotating || isLoading ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span>{isLoading ? 'Syncing...' : 'Sync Blockchain'}</span>
        </button>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div className="usdt-balance-display">
          <span>{balance || '0.00'}</span>
          <span className="usdt-symbol">USDT</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '16px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '0.85rem',
            }}
          >
            <span>Wallet:</span>
            <code
              style={{
                fontFamily: 'var(--font-mono)',
                color: '#ffffff',
                background: 'rgba(0, 0, 0, 0.35)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.82rem',
              }}
            >
              {shortenAddress(walletAddress)}
            </code>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={getExplorerUrl(walletAddress, chainId)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{
                fontSize: '0.78rem',
                color: '#00E676',
                padding: '4px 10px',
              }}
            >
              <span>View Explorer</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
