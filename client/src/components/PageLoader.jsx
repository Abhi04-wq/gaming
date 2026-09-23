import React, { useState, useEffect } from 'react';
import LogoWebp from '../logo.webp';

const LOADING_STEPS = [
  { at: 0, text: 'Initializing Decentralized Gaming Protocol...' },
  { at: 22, text: 'Connecting to EVM Smart Contracts...' },
  { at: 45, text: 'Syncing Live LXT Prize Pools & Jackpots...' },
  { at: 70, text: 'Calibrating Provably Fair RNG Engines...' },
  { at: 90, text: 'Loading Verified Game Arenas...' },
  { at: 98, text: 'Welcome to Loyalty Game! Launching...' },
];

export default function PageLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState(LOADING_STEPS[0].text);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth, realistic progressive loading curve
    let current = 0;
    const interval = setInterval(() => {
      // Faster at start, steady in middle, rapid finish
      let increment = 1;
      if (current < 30) {
        increment = Math.random() * 3 + 2;
      } else if (current < 75) {
        increment = Math.random() * 2.5 + 1.2;
      } else if (current < 95) {
        increment = Math.random() * 2 + 0.8;
      } else {
        increment = 2.5;
      }

      current = Math.min(100, current + increment);
      setProgress(Math.floor(current));

      // Update status message based on milestones
      for (let i = LOADING_STEPS.length - 1; i >= 0; i--) {
        if (current >= LOADING_STEPS[i].at) {
          setStatusText(LOADING_STEPS[i].text);
          break;
        }
      }

      if (current >= 100) {
        clearInterval(interval);
        // Brief pause at 100% before smooth fade out
        setTimeout(() => {
          setIsExiting(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 500);
        }, 250);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`page-loader-overlay ${isExiting ? 'page-loader-fadeout' : ''}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      {/* Background glow ambiance */}
      <div className="loader-ambient-glow" />

      <div className="loader-content-card">
        {/* Holographic glowing ring around official logo */}
        <div className="loader-logo-wrapper">
          <div className="loader-ring loader-ring-outer" />
          <div className="loader-ring loader-ring-inner" />
          <div className="loader-ring loader-ring-pulse" />
          <div className="loader-logo-container">
            <img
              src={LogoWebp}
              alt="Loyalty Game Logo"
              className="loader-logo-img"
            />
          </div>
        </div>

        {/* Brand identity titles */}
        <div className="loader-brand-header">
          <h2 className="loader-brand-title">
            LOYALTY <span className="loader-brand-highlight">GAME</span>
          </h2>
          <p className="loader-brand-subtitle">
            NEXT-GEN WEB3 GAMING ECOSYSTEM
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="loader-progress-section">
          <div className="loader-progress-track">
            <div
              className="loader-progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="loader-progress-glow-tip" />
              <div className="loader-progress-shimmer" />
            </div>
          </div>

          {/* Real-time status text and percentage */}
          <div className="loader-meta-row">
            <div className="loader-status-text">
              <span className="loader-status-dot" />
              <span className="loader-status-label">{statusText}</span>
            </div>
            <div className="loader-percent-badge">
              <span>{progress}%</span>
            </div>
          </div>
        </div>

        {/* Cyberpunk circuit nodes footer */}
        <div className="loader-footer-nodes">
          <span className="node-item">● SECURE EVM</span>
          <span className="node-sep">|</span>
          <span className="node-item">● PROVABLY FAIR</span>
          <span className="node-sep">|</span>
          <span className="node-item">● LXT REWARDS</span>
        </div>
      </div>
    </div>
  );
}
