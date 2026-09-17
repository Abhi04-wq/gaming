import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { GAME_CATALOG, getGameRedirectUrl } from './GamesLobby';

// Dedicated in-app play page: URL stays on YOUR domain (/play/:gameId)
// instead of exposing the external Gamezop CDN URL in the address bar.
// No Navbar is rendered here, so the game gets the full screen.
export default function GamePlay() {
  const { gameId } = useParams();
  const game = GAME_CATALOG.find((g) => g.id === gameId);

  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showStuck, setShowStuck] = useState(false);

  // Show the stuck-notice 3 seconds after (re)load
  useEffect(() => {
    setIsLoading(true);
    setShowStuck(false);
    const timer = setTimeout(() => setShowStuck(true), 3000);
    return () => clearTimeout(timer);
  }, [gameId, iframeKey]);

  // Print in console whatever value the open game iframe sends back (postMessage)
  useEffect(() => {
    const handleGameMessage = (event) => {
      if (!event.data) return;
      if (typeof event.data === 'string' && event.data.startsWith('webpack')) return;

      let parsed = event.data;
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data);
        } catch (_) {
          parsed = event.data;
        }
      }

      console.log(
        '%c🎮 [GAME RETURN VALUE]',
        'background: #00E676; color: #000000; font-weight: 900; font-size: 13px; padding: 3px 8px; border-radius: 4px;',
        parsed
      );
      console.log('[Game Details] Origin:', event.origin, '| Raw Data:', event.data);
    };

    window.gzpCallback = (val) => {
      console.log('%c🎮 [GZP CALLBACK RETURN VALUE]', 'background: #FFB300; color: #000; font-weight: bold; padding: 2px 6px;', val);
    };
    window.onGameOver = (val) => {
      console.log('%c🎮 [GAME OVER RETURN VALUE]', 'background: #FF5252; color: #fff; font-weight: bold; padding: 2px 6px;', val);
    };

    window.addEventListener('message', handleGameMessage);
    return () => window.removeEventListener('message', handleGameMessage);
  }, []);

  useEffect(() => {
    document.title = game ? `${game.title} | LXT` : 'Game Not Found | LXT';
  }, [game]);

  if (!game) {
    return (
      <div className="website-fullscreen-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <h2>Game not found</h2>
          <p style={{ color: '#A3A3A3' }}>This game does not exist.</p>
          <Link to="/games" className="gz-alert-launch-btn" style={{ marginTop: '12px', display: 'inline-flex' }}>
            <ArrowLeft size={14} />
            <span>Back to Games</span>
          </Link>
        </div>
      </div>
    );
  }

  const directUrl = game ? getGameRedirectUrl(game) : null;
  const iframeSrc = game ? game.embedUrl || directUrl : null;

  useEffect(() => {
    if (game) {
      console.log('[GameLaunch] Opening game page:', {
        id: game.id,
        title: game.title,
        gzCode: game.gzCode,
        iframeSrc,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  return (
    <div className={`website-fullscreen-overlay ${showStuck ? 'has-alert' : ''}`}>
      {/* Top HUD Bar */}
      <div className="fullscreen-hud-bar">
        <div className="fullscreen-hud-left">
          <img src={game.logoUrl} alt={game.title} className="fullscreen-game-icon" />
          <div>
            <h3 className="fullscreen-game-title">{game.title}</h3>
            <span className="fullscreen-game-meta">
              <span className="gz-live-dot" /> LXT • {game.categoryLabel}
            </span>
          </div>
        </div>

        <div className="fullscreen-hud-right">
          <Link to="/games" className="fullscreen-hud-btn" title="Back to Games Lobby">
            <ArrowLeft size={14} />
            <span>All Games</span>
          </Link>
          <button
            onClick={() => {
              setIsLoading(true);
              setIframeKey((prev) => prev + 1);
            }}
            className="fullscreen-hud-btn"
            title="Restart Game"
          >
            <RotateCw size={14} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Stuck notice - after 3 sec, with direct-version fallback */}
      {showStuck && (
        <div className="fullscreen-alert-bar">
          <div className="fullscreen-alert-left">
            <AlertTriangle size={16} color="#FFB300" style={{ flexShrink: 0 }} />
            <span>
              <strong>{game.title} Notice:</strong> If the game is stuck here, open the direct version:
            </span>
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fullscreen-alert-redirect-btn"
            title="Open direct game version"
          >
            <ExternalLink size={14} />
            <span>Direct Version</span>
          </a>
        </div>
      )}

      {/* Game Iframe */}
      <div className="fullscreen-iframe-wrapper">
        {isLoading && (
          <div className="gz-iframe-loader fullscreen-loader">
            <div className="gz-spinner" />
            <h4>Loading {game.title}...</h4>
            <p>Connecting to Gamezop CDN HTML5 engine</p>
          </div>
        )}
        <iframe
          key={iframeKey}
          src={iframeSrc}
          title={game.title}
          className="fullscreen-game-iframe"
          allow="autoplay; fullscreen; screen-wake-lock; orientation-lock;"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
          onLoad={() => {
            setIsLoading(false);
            console.log('[GameIframe] Play page iframe loaded:', iframeSrc);
          }}
        />
      </div>
    </div>
  );
}
