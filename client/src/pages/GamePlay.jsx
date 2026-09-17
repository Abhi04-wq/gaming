import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  ExternalLink,
  AlertTriangle,
  Trophy,
  Wallet,
  ShieldAlert,
  LogIn,
  CheckCircle2,
  Award,
  Target,
} from 'lucide-react';
import { GAME_CATALOG, getGameRedirectUrl } from './GamesLobby';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Dedicated in-app play page (/play/:gameId)
// Displays Entry Pool, Threshold Score, Prize Pool, and Live Balance
// Strictly checks return JSON: state=start -> deducts entry fee; state=over -> calculates if score >= threshold to win prize pool
export default function GamePlay() {
  const { gameId } = useParams();
  const game = GAME_CATALOG.find((g) => g.id === gameId);
  const { user, updateBalance } = useAuth();

  // Load configured entry pool, prize pool & threshold score from admin overrides (or fallback)
  let initialEntryPool = game?.entryPool || '1.00';
  let initialPrizePool = game?.prizePool || '100.00';
  let initialThresholdScore = game?.thresholdScore || '500';

  try {
    const saved = localStorage.getItem('loyalty_admin_game_overrides');
    if (saved) {
      const overrides = JSON.parse(saved);
      if (overrides[gameId]) {
        if (overrides[gameId].entryPool !== undefined) initialEntryPool = overrides[gameId].entryPool;
        if (overrides[gameId].prizePool !== undefined) initialPrizePool = overrides[gameId].prizePool;
        if (overrides[gameId].thresholdScore !== undefined) initialThresholdScore = overrides[gameId].thresholdScore;
      }
    }
  } catch (_) {}

  const entryPool = initialEntryPool;
  const prizePool = initialPrizePool;
  const thresholdScore = initialThresholdScore;

  const [iframeKey, setIframeKey] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showStuck, setShowStuck] = useState(false);
  const [isRoundDeducted, setIsRoundDeducted] = useState(false);
  const [isDeducting, setIsDeducting] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [toastAlert, setToastAlert] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  // Live round state for the two conditions
  const [currentScore, setCurrentScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [roundStatus, setRoundStatus] = useState('idle'); // 'idle' | 'started' | 'over'
  const [showSimControls, setShowSimControls] = useState(false);

  const isDeductingRef = useRef(false);
  const isRoundDeductedRef = useRef(false);
  const currentScoreRef = useRef(0);
  const isPrizeAwardedRef = useRef(false);

  useEffect(() => {
    isRoundDeductedRef.current = isRoundDeducted;
  }, [isRoundDeducted]);

  useEffect(() => {
    currentScoreRef.current = currentScore;
  }, [currentScore]);

  // Show stuck notice 3 seconds after (re)load
  useEffect(() => {
    setIsLoading(true);
    setShowStuck(false);
    const timer = setTimeout(() => setShowStuck(true), 3000);
    return () => clearTimeout(timer);
  }, [gameId, iframeKey]);

  // Core Deduction Function: Triggered ONLY when return status is 'start'
  const handleGameStartDeduction = async (isRestart = false) => {
    if (!game) return;

    if (!user?.walletAddress) {
      return;
    }

    if (isRoundDeductedRef.current || isDeductingRef.current) {
      console.log('[GamePlay: Start] Round entry already deducted or in progress.');
      return;
    }

    const fee = parseFloat(entryPool);
    const balance = parseFloat(user.usdtBalance || '0');

    if (balance < fee) {
      setInsufficientFunds(true);
      return;
    }

    isDeductingRef.current = true;
    setIsDeducting(true);

    try {
      console.log(`[GamePlay: Start] Return status 'start' confirmed. Deducting entry fee of ${fee} USDT for game: ${gameId}`);
      const res = await api.deductGameEntry(user.walletAddress, gameId, fee, game?.title || null);

      if (res.success) {
        updateBalance(res.newBalance);
        setIsRoundDeducted(true);
        isRoundDeductedRef.current = true;
        setRoundStatus('started');
        setInsufficientFunds(false);

        setToastAlert({
          text: isRestart
            ? `🔄 Round Restarted! (Status: start) - Deducted -${fee.toFixed(2)} USDT (Balance: ${res.newBalance} USDT)`
            : `🎮 Game Started! Return status: 'start' -> Deducted -${fee.toFixed(2)} USDT (Balance: ${res.newBalance} USDT)`,
          type: 'success',
        });

        setTimeout(() => setToastAlert(null), 5000);
      } else {
        setToastAlert({
          text: res.message || 'Failed to deduct entry fee.',
          type: 'error',
        });
      }
    } catch (err) {
      console.error('[GameStart Deduction Error]', err);
      const msg = err.data?.message || err.message || 'Error processing entry';
      if (msg.toLowerCase().includes('insufficient')) {
        setInsufficientFunds(true);
      } else {
        setToastAlert({ text: `❌ ${msg}`, type: 'error' });
      }
    } finally {
      isDeductingRef.current = false;
      setIsDeducting(false);
    }
  };

  // Prize Pool Credit Function: Triggered ONLY when:
  // Condition 1: Score exceeded threshold (score >= threshold)
  // Condition 2: Game is over (status is 'over')
  const handlePrizeWon = async (score, target, prize) => {
    if (!user?.walletAddress) return;
    if (isPrizeAwardedRef.current) {
      console.log('[GamePlay: Prize] Prize already awarded for this round.');
      return;
    }

    isPrizeAwardedRef.current = true;

    try {
      console.log(`[GamePlay: Over] Condition 1 (Score ${score} >= ${target}) & Condition 2 (Game Over) MET! Crediting ${prize} USDT...`);
      const res = await api.creditPrizeReward({
        address: user.walletAddress,
        gameId,
        gameTitle: game?.title || null,
        score,
        threshold: target,
        prizeAmount: prize,
      });

      if (res.success) {
        updateBalance(res.newBalance);
        setGameResult({
          won: true,
          score,
          threshold: target,
          prize,
          condition1Passed: true,
          condition2Passed: true,
          newBalance: res.newBalance,
          time: new Date().toLocaleTimeString(),
        });

        setToastAlert({
          text: `🎉 REWARD CLAIMED! Condition 1 (Score: ${score} >= ${target}) & Condition 2 (Game Over) PASSED! +${prize} USDT credited!`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('[Credit Prize Error]', err);
      isPrizeAwardedRef.current = false;
    }
  };

  // Central Game Event Processor: Evaluates Return Status 'start' and the Two Reward Conditions
  const processGameEvent = (parsed) => {
    if (!parsed) return;

    // Extract state/status/name/event/action from the return JSON
    const rawState =
      parsed?.name ??
      parsed?.state ??
      parsed?.status ??
      parsed?.event ??
      parsed?.action ??
      parsed?.type ??
      (typeof parsed === 'string' ? parsed : '');
    const stateStr = String(rawState).toLowerCase().trim();

    // Extract numerical score if present
    const incomingScore =
      parsed?.score !== undefined ? Number(parsed.score) :
      parsed?.data?.score !== undefined ? Number(parsed.data.score) :
      parsed?.payload?.score !== undefined ? Number(parsed.payload.score) :
      parsed?.points !== undefined ? Number(parsed.points) :
      parsed?.value !== undefined ? Number(parsed.value) :
      null;

    const target = parseFloat(thresholdScore || '500');
    const prize = parseFloat(prizePool || '100.00');

    // Update current score if valid score received
    let updatedScore = currentScoreRef.current;
    if (incomingScore !== null && !isNaN(incomingScore)) {
      updatedScore = Math.max(currentScoreRef.current, incomingScore);
      currentScoreRef.current = updatedScore;
      setCurrentScore(updatedScore);
    }

    // Check Condition 1: Has player exceeded or reached the threshold score?
    const condition1_exceededScore = updatedScore >= target;

    // Check Condition 2: Is the game over?
    const condition2_isGameOver =
      stateStr === 'over' ||
      stateStr === 'gameover' ||
      stateStr === 'game_over' ||
      stateStr === 'roundend' ||
      stateStr === 'end' ||
      stateStr === 'ended';

    console.log(
      '%c🎮 [GAME EVENT PROCESSED]',
      'background: #00E676; color: #000; font-weight: 800; padding: 3px 8px; border-radius: 4px;',
      {
        stateStr,
        incomingScore,
        currentScore: updatedScore,
        targetThreshold: target,
        condition1_exceededScore,
        condition2_isGameOver,
        isRoundDeducted: isRoundDeductedRef.current,
      }
    );

    // =========================================================================
    // 0. RELOAD & RESTART DETECTION:
    // Reset round state so entry fee can be deducted on return status 'start'
    // =========================================================================
    const isReloadOrRestart =
      stateStr === 'reload' ||
      stateStr === 'reloaded' ||
      stateStr === 'restart' ||
      stateStr === 'restarted' ||
      stateStr === 'playagain' ||
      stateStr === 'play_again' ||
      stateStr === 'retry' ||
      stateStr === 'rematch' ||
      stateStr === 'reset' ||
      stateStr === 'newgame' ||
      stateStr === 'new_game' ||
      Boolean(parsed?.reload) ||
      Boolean(parsed?.restart);

    const isStart =
      stateStr === 'start' ||
      stateStr === 'started' ||
      stateStr === 'gamestart' ||
      stateStr === 'game_start' ||
      stateStr === 'gameplaystart' ||
      stateStr === 'play' ||
      stateStr === 'roundstart';

    // If reload/restart occurs OR if previous round was over and a new start arrives:
    if (isReloadOrRestart || ((isGameOver || isPrizeAwardedRef.current || gameResult) && isStart)) {
      console.log('%c🔄 [RELOAD / NEW ROUND DETECTED] Resetting round state to enable entry deduction...', 'background: #FFB300; color: #000; font-weight: bold;');
      setIsRoundDeducted(false);
      isRoundDeductedRef.current = false;
      isPrizeAwardedRef.current = false;
      setCurrentScore(0);
      currentScoreRef.current = 0;
      setIsGameOver(false);
      setRoundStatus('idle');
      setGameResult(null);
    }

    // =========================================================================
    // 1. DEDUCTION RULE: Deduct money ONLY when return status is 'start'
    // =========================================================================
    if (isStart) {
      console.log('%c🚀 [RETURN STATUS: START DETECTED] Deducting money from account for round...', 'background: #39FF88; color: #000; font-weight: bold;');
      if (!isRoundDeductedRef.current) {
        handleGameStartDeduction(isReloadOrRestart);
      }
    }

    // =========================================================================
    // 2. REWARD RULES: Evaluate TWO Conditions:
    //    Condition 1: Exceed score or not? (score >= thresholdScore)
    //    Condition 2: Check game over or not? (isGameOver === true)
    // =========================================================================
    if (condition2_isGameOver) {
      setIsGameOver(true);
      setRoundStatus('over');

      console.log(
        '%c🏁 [GAME OVER DETECTED - EVALUATING TWO CONDITIONS]',
        'background: #FFD700; color: #000; font-weight: bold; font-size: 13px;',
        {
          'Condition 1 (Score Exceeded?)': condition1_exceededScore ? 'PASSED ✅' : 'FAILED ❌',
          'Condition 2 (Game Over?)': 'PASSED ✅',
          finalScore: updatedScore,
          targetThreshold: target,
          prizeReward: prize,
        }
      );

      // BOTH CONDITIONS MET: Condition 1 (Score Exceeded) AND Condition 2 (Game Over)
      if (condition1_exceededScore) {
        handlePrizeWon(updatedScore, target, prize);
      } else {
        // Condition 1 FAILED: Score did not reach threshold
        setGameResult({
          won: false,
          score: updatedScore,
          threshold: target,
          prize,
          condition1Passed: false,
          condition2Passed: true,
          time: new Date().toLocaleTimeString(),
        });

        setToastAlert({
          text: `🏁 Game Over! Condition 1 Failed: Score ${updatedScore} did not exceed target ${target} PTS. No prize reward.`,
          type: 'info',
        });
      }
    } else if (condition1_exceededScore && !isPrizeAwardedRef.current) {
      // Condition 1 MET during active play, but Condition 2 (Game Over) is still pending
      console.log(`[Score Exceeded] Current score ${updatedScore} >= ${target}! Waiting for Condition 2 (Game Over) to reward prize...`);
    }
  };

  // Check state from return JSON (Gamezop / HTML5 Game postMessage & window callbacks)
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

      processGameEvent(parsed);
    };

    window.addEventListener('message', handleGameMessage);

    // Also wire global callback handlers for games
    window.onGameOver = (score) => {
      processGameEvent({ state: 'gameover', score });
    };
    window.onGameScore = (score) => {
      processGameEvent({ state: 'score', score });
    };
    window.onGameStart = () => {
      processGameEvent({ state: 'start' });
    };
    window.onGameReload = () => {
      processGameEvent({ state: 'reload' });
    };
    window.onGameRestart = () => {
      processGameEvent({ state: 'restart' });
    };

    return () => {
      window.removeEventListener('message', handleGameMessage);
      delete window.onGameOver;
      delete window.onGameScore;
      delete window.onGameStart;
      delete window.onGameReload;
      delete window.onGameRestart;
    };
  }, [gameId, entryPool, prizePool, thresholdScore, user?.walletAddress]);

  useEffect(() => {
    document.title = game ? `${game.title} | Loyalty Game` : 'Game Not Found | Loyalty Game';
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

  // Manual Restart Action: Resets round deduction flag and reloads game; deduction will trigger on status 'start'
  const handleRestartNewRound = () => {
    console.log('[GamePlay] User clicked Restart: Resetting round and waiting for status start');
    setIsRoundDeducted(false);
    isRoundDeductedRef.current = false;
    isPrizeAwardedRef.current = false;
    setCurrentScore(0);
    currentScoreRef.current = 0;
    setIsGameOver(false);
    setRoundStatus('idle');
    setGameResult(null);
    setIframeKey((prev) => prev + 1);
    setIsLoading(true);
  };

  const targetNum = parseFloat(thresholdScore || '500');
  const isCondition1Exceeded = currentScore >= targetNum;

  return (
    <div className={`website-fullscreen-overlay ${showStuck ? 'has-alert' : ''}`}>
      {/* Top HUD Bar with Entry Pool, Threshold Score, Prize Pool, Live Balance & Two Conditions */}
      <div className="fullscreen-hud-bar">
        <div className="fullscreen-hud-left">
          <img src={game.logoUrl} alt={game.title} className="fullscreen-game-icon" />
          <div>
            <h3 className="fullscreen-game-title">{game.title}</h3>
            <span className="fullscreen-game-meta">
              <span className="gz-live-dot" /> Loyalty Game • {game.categoryLabel}
            </span>
          </div>
        </div>

        {/* Prize Pool, Threshold Score, Entry Pool, Balance & Condition Badges */}
        <div className="fullscreen-hud-pools">
          {/* Entry Status: Deducts ONLY when state is 'start' */}
          <div
            className="hud-pool-badge entry-badge"
            title="Entry pool fee is deducted from account only when game returns status 'start'"
            style={{
              borderColor: isRoundDeducted ? '#00E676' : 'rgba(255,255,255,0.2)',
            }}
          >
            <span className="hud-badge-label">Entry ({entryPool} USDT):</span>
            <span className="hud-badge-value" style={{ color: isRoundDeducted ? '#39FF88' : '#cbd5e1' }}>
              {isRoundDeducted ? '✅ Deducted' : '⏳ Awaiting Start'}
            </span>
          </div>

          {/* Condition 1: Exceed Score or not */}
          <div
            className="hud-pool-badge"
            style={{
              background: isCondition1Exceeded ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 179, 0, 0.12)',
              border: isCondition1Exceeded ? '1px solid #00E676' : '1px solid rgba(255, 179, 0, 0.45)',
              color: isCondition1Exceeded ? '#39FF88' : '#FFE082',
            }}
            title="Condition 1: Score must exceed or touch threshold score"
          >
            <Target size={13} color={isCondition1Exceeded ? '#00E676' : '#FFB300'} />
            <span className="hud-badge-label">Cond 1 (Score &ge; {thresholdScore}):</span>
            <span className="hud-badge-value" style={{ color: isCondition1Exceeded ? '#00E676' : '#FFB300', fontWeight: 800 }}>
              {currentScore} PTS {isCondition1Exceeded ? '✅' : '❌'}
            </span>
          </div>

          {/* Condition 2: Check Game Over or not */}
          <div
            className="hud-pool-badge"
            style={{
              background: isGameOver ? 'rgba(255, 82, 82, 0.15)' : 'rgba(56, 189, 248, 0.12)',
              border: isGameOver ? '1px solid #FF5252' : '1px solid rgba(56, 189, 248, 0.45)',
              color: isGameOver ? '#FF5252' : '#38BDF8',
            }}
            title="Condition 2: Game must be over before reward is credited"
          >
            <span className="hud-badge-label">Cond 2 (Game Over):</span>
            <span className="hud-badge-value" style={{ color: isGameOver ? '#FF5252' : '#38BDF8', fontWeight: 800 }}>
              {isGameOver ? '🏁 Over' : '🎮 In Progress'}
            </span>
          </div>

          {/* Prize Pool */}
          <div className="hud-pool-badge prize-badge" title="Prize Pool credited when Condition 1 (Exceed Score) & Condition 2 (Game Over) are BOTH met">
            <Trophy size={13} color="#FFB300" />
            <span className="hud-badge-label">Prize:</span>
            <span className="hud-badge-value">{prizePool} USDT</span>
          </div>

          {/* User Balance */}
          <div className="hud-pool-badge balance-badge" title="Your Live Account Balance">
            <Wallet size={13} color="#39FF88" />
            <span className="hud-badge-label">Balance:</span>
            <span className="hud-badge-value">{user?.usdtBalance || '0.00'} USDT</span>
          </div>
        </div>

        <div className="fullscreen-hud-right">
          <button
            onClick={() => setShowSimControls((prev) => !prev)}
            className="fullscreen-hud-btn"
            style={{
              background: showSimControls ? '#FFB300' : 'rgba(255,255,255,0.06)',
              color: showSimControls ? '#000' : '#FFB300',
              borderColor: '#FFB300',
              fontWeight: 700,
            }}
            title="Toggle interactive simulation toolbar to test start status and reward conditions"
          >
            <span>🧪 Test Conditions</span>
          </button>
          <Link to="/games" className="fullscreen-hud-btn" title="Back to All Games">
            <ArrowLeft size={14} />
            <span>All Games</span>
          </Link>
          <button
            onClick={handleRestartNewRound}
            className="fullscreen-hud-btn"
            title="Restart Game Round (waits for return status 'start' to deduct entry fee)"
          >
            <RotateCw size={14} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulation Bar for Testing Return Status and the Two Conditions */}
      {showSimControls && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            left: '0',
            right: '0',
            background: 'rgba(15, 23, 42, 0.96)',
            borderBottom: '1px solid rgba(255, 179, 0, 0.4)',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            zIndex: 45,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#FFB300', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🧪 Condition Test Controls:
          </span>
          <button
            onClick={() => processGameEvent({ state: 'start' })}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#00E676', color: '#000', borderColor: '#00E676', fontWeight: 800 }}
            title="Simulate game returning status 'start' -> Deducts entry fee"
          >
            1. Trigger Status 'start' (-{entryPool} USDT)
          </button>
          <button
            onClick={() => processGameEvent({ state: 'score', score: targetNum + 50 })}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255, 179, 0, 0.2)', borderColor: '#FFB300', color: '#FFE082' }}
            title="Simulate Condition 1: Exceed score without ending game"
          >
            2. Pass Cond 1 (Score: {targetNum + 50} PTS)
          </button>
          <button
            onClick={() => processGameEvent({ state: 'over', score: 150 })}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255, 82, 82, 0.2)', borderColor: '#FF5252', color: '#FF8A80' }}
            title="Simulate Condition 2 (Game Over) with low score (Condition 1 Fails -> No Money)"
          >
            3. Game Over (Cond 1 Fails: 150 PTS &rarr; No Money)
          </button>
          <button
            onClick={() => processGameEvent({ state: 'over', score: targetNum + 100 })}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#FFD700', color: '#000', borderColor: '#FFD700', fontWeight: 800 }}
            title="Simulate BOTH Conditions: Score Exceeded + Game Over -> Gives Money!"
          >
            4. Both Conditions Met (Score {targetNum + 100} &plus; Over &rarr; +{prizePool} USDT)
          </button>
          <button
            onClick={() => {
              processGameEvent({ state: 'reload' });
              setTimeout(() => processGameEvent({ state: 'start' }), 50);
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(0, 230, 118, 0.15)', borderColor: '#00E676', color: '#00E676', fontWeight: 700 }}
            title="Simulate In-Game Reload: Game reloads and state is start again -> Deducts entry fee"
          >
            5. In-Game Reload &rarr; State 'start' (-{entryPool} USDT)
          </button>
          <button
            onClick={handleRestartNewRound}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            title="Reset round state"
          >
            Reset
          </button>
        </div>
      )}

      {/* Floating Success / Game Result Toast */}
      {toastAlert && (
        <div
          style={{
            position: 'absolute',
            top: showSimControls ? '110px' : '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 20, 14, 0.96)',
            border: '1px solid #00E676',
            boxShadow: '0 0 20px rgba(0, 230, 118, 0.3)',
            color: '#FFFFFF',
            padding: '10px 20px',
            borderRadius: '10px',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} color="#00E676" />
          <span>{toastAlert.text}</span>
        </div>
      )}

      {/* Round Finished Outcome Banner (Evaluates Condition 1 & Condition 2) */}
      {gameResult && (
        <div
          style={{
            position: 'absolute',
            top: showSimControls ? '160px' : '115px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: gameResult.won ? 'rgba(10, 30, 18, 0.96)' : 'rgba(25, 20, 10, 0.96)',
            border: gameResult.won ? '1.5px solid #00E676' : '1px solid #FFB300',
            boxShadow: gameResult.won ? '0 0 35px rgba(0, 230, 118, 0.4)' : '0 0 25px rgba(255, 179, 0, 0.25)',
            color: gameResult.won ? '#FFFFFF' : '#FFE082',
            padding: '14px 24px',
            borderRadius: '14px',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '0.9rem',
            fontWeight: 700,
            maxWidth: '92%',
          }}
        >
          {gameResult.won ? (
            <Trophy size={24} color="#00E676" />
          ) : (
            <Award size={22} color="#FFD700" />
          )}

          <div>
            <div style={{ fontSize: '1rem', color: gameResult.won ? '#00E676' : '#FFD700', fontWeight: 800 }}>
              {gameResult.won ? '🎉 PRIZE POOL REWARD CLAIMED!' : '🏁 GAME OVER (THRESHOLD NOT REACHED)'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>
                <strong>Condition 1 (Score Exceeded?):</strong>{' '}
                <span style={{ color: gameResult.condition1Passed ? '#00E676' : '#FF5252', fontWeight: 700 }}>
                  {gameResult.condition1Passed ? `PASSED (${gameResult.score} >= ${gameResult.threshold} PTS)` : `FAILED (${gameResult.score} < ${gameResult.threshold} PTS)`}
                </span>
              </span>
              <span>
                <strong>Condition 2 (Game Over?):</strong>{' '}
                <span style={{ color: '#00E676', fontWeight: 700 }}>PASSED (Over)</span>
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
              {gameResult.won ? (
                <span style={{ color: '#00E676', fontWeight: 800 }}>
                  Both conditions satisfied! +{gameResult.prize} USDT credited to your wallet account!
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Condition 1 was not satisfied. Prize pool of {gameResult.prize} USDT requires score &ge; {gameResult.threshold} PTS.
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRestartNewRound}
            className="fullscreen-hud-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              background: '#00E676',
              color: '#000',
              borderColor: '#00E676',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            <RotateCw size={13} />
            <span>Play Again</span>
          </button>
        </div>
      )}

      {/* Not Logged In Blocker Overlay */}
      {!user?.walletAddress && (
        <div className="game-insufficient-overlay">
          <div className="game-insufficient-card">
            <LogIn size={44} color="#00E676" />
            <h3>Login Required</h3>
            <p>
              Please connect your wallet or log in to play <strong>{game.title}</strong> and compete for the prize pool.
            </p>
            <div className="game-insufficient-meta">
              <span>Entry Fee: <strong style={{ color: '#FFFFFF' }}>{entryPool} USDT</strong></span>
              <span>Target Score: <strong style={{ color: '#FFB300' }}>{thresholdScore} PTS</strong></span>
              <span>Prize Pool: <strong style={{ color: '#00E676' }}>{prizePool} USDT</strong></span>
            </div>
            <div className="game-insufficient-actions">
              <Link to="/login" className="fullscreen-hud-btn" style={{ background: '#00E676', color: '#000', borderColor: '#00E676' }}>
                <LogIn size={14} />
                <span>Log In to Play</span>
              </Link>
              <Link to="/games" className="fullscreen-hud-btn">
                <ArrowLeft size={14} />
                <span>Back to Lobby</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Balance Blocker Overlay */}
      {insufficientFunds && (
        <div className="game-insufficient-overlay">
          <div className="game-insufficient-card">
            <ShieldAlert size={44} color="#FF5252" />
            <h3>Insufficient USDT Balance</h3>
            <p>
              Entering the <strong>{game.title}</strong> prize pool requires an entry fee of{' '}
              <strong style={{ color: '#00E676' }}>{entryPool} USDT</strong>.
            </p>
            <div className="game-insufficient-meta">
              <span>Required: <strong style={{ color: '#FFFFFF' }}>{entryPool} USDT</strong></span>
              <span>Your Balance: <strong style={{ color: '#FF5252' }}>{user?.usdtBalance || '0.00'} USDT</strong></span>
            </div>
            <div className="game-insufficient-actions">
              <Link to="/dashboard" className="fullscreen-hud-btn" style={{ background: '#00E676', color: '#000', borderColor: '#00E676' }}>
                <Wallet size={14} />
                <span>Deposit / Manage USDT</span>
              </Link>
              <Link to="/games" className="fullscreen-hud-btn">
                <ArrowLeft size={14} />
                <span>Back to Lobby</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stuck notice - after 3 sec, with direct-version fallback */}
      {showStuck && !insufficientFunds && (
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

      {/* Game Iframe: Loads the game without deducting money. Deduction occurs when return status is 'start'. */}
      {user?.walletAddress && !insufficientFunds && (
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
              console.log('[GameIframe] Play page iframe loaded/reloaded (Ready to deduct on return status "start"):', iframeSrc);
              setIsRoundDeducted(false);
              isRoundDeductedRef.current = false;
              isPrizeAwardedRef.current = false;
              setCurrentScore(0);
              currentScoreRef.current = 0;
              setIsGameOver(false);
              setRoundStatus('idle');
              setGameResult(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
