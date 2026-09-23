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
import { fetchGameConfigs } from '../services/gameConfigService';
import LudoGameBoard from '../components/games/ludo/LudoGameBoard';

// Dedicated in-app play page (/play/:gameId)
// Displays Entry Pool, Threshold Score, Prize Pool, and Live Balance
// Strictly checks return JSON: state=start -> deducts entry fee; state=over -> calculates if score >= threshold to win prize pool
export default function GamePlay() {
  const { gameId } = useParams();
  const game = GAME_CATALOG.find((g) => g.id === gameId) ||
    (gameId === 'carrom' ? GAME_CATALOG.find((g) => g.id === 'carrom-hero') : null);
  const { user, updateBalance } = useAuth();

  // Admin pools database theke (kono localStorage noy) — sob browser-e same value
  const [gameConfigs, setGameConfigs] = useState({});
  useEffect(() => {
    let cancelled = false;
    fetchGameConfigs()
      .then((cfg) => { if (!cancelled) setGameConfigs(cfg); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load configured entry pool, prize pool & threshold score from database (or fallback)
  const gameOv = gameConfigs[gameId] ||
    (gameId?.includes('ludo') ? (gameConfigs['ludo-with-friends'] || gameConfigs['ludo-dash'] || gameConfigs['ludo']) : null);
  let initialEntryPool = gameOv?.entryPool !== undefined ? gameOv.entryPool : (game?.entryPool || '1.00');
  let initialPrizePool = gameOv?.prizePool !== undefined ? gameOv.prizePool : (game?.prizePool || '100.00');
  let initialThresholdScore = gameOv?.thresholdScore !== undefined ? gameOv.thresholdScore : (game?.thresholdScore || '500');
  let initialLudo2pEntry = gameOv?.ludo2pEntryPool !== undefined ? gameOv.ludo2pEntryPool : (game?.ludo2pEntryPool || '1.00');
  let initialLudo2pPrize = gameOv?.ludo2pPrizePool !== undefined ? gameOv.ludo2pPrizePool : (game?.ludo2pPrizePool || '20.00');
  let initialLudo4pEntry = gameOv?.ludo4pEntryPool !== undefined ? gameOv.ludo4pEntryPool : (game?.ludo4pEntryPool || '2.00');
  let initialLudo4pPrize = gameOv?.ludo4pPrizePool !== undefined ? gameOv.ludo4pPrizePool : (game?.ludo4pPrizePool || '50.00');

  const isFixedThresholdGame =
    gameId === 'carrom-hero' || gameId === 'carrom' || gameId === 'chess-grandmaster' || gameId === 'chess';
  const entryPool = initialEntryPool;
  const prizePool = initialPrizePool;
  const thresholdScore = isFixedThresholdGame ? '1' : initialThresholdScore;

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
  // Listener closure stale state dhore rakhe, tai round-end track ref-e (win OR lose)
  const gameOverRef = useRef(false);
  const gameResultRef = useRef(null);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const isDailyChallengeRef = useRef(false);
  const isChessMode1SelectedRef = useRef(false);
  const isChessFreeModeRef = useRef(false);
  const lastDeductedAmountRef = useRef(0);

  useEffect(() => {
    isDailyChallengeRef.current = isDailyChallenge;
  }, [isDailyChallenge]);

  useEffect(() => {
    isRoundDeductedRef.current = isRoundDeducted;
  }, [isRoundDeducted]);

  useEffect(() => {
    currentScoreRef.current = currentScore;
  }, [currentScore]);

  useEffect(() => {
    gameOverRef.current = isGameOver;
  }, [isGameOver]);

  useEffect(() => {
    gameResultRef.current = gameResult;
  }, [gameResult]);

  const isNativeLudo = game?.playableType === 'native-ludo' || gameId === 'ludo-with-friends' || gameId === 'ludo-dash' || gameId === 'ludo';

  // Show stuck notice 3 seconds after (re)load
  useEffect(() => {
    if (isNativeLudo) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setShowStuck(false);
    const timer = setTimeout(() => setShowStuck(true), 3000);
    return () => clearTimeout(timer);
  }, [gameId, iframeKey, isNativeLudo]);

  // Pre-flight check: Immediately block game and show error overlay if wallet balance < entry fee
  useEffect(() => {
    if (!user) return;
    if (isDailyChallenge || isRoundDeducted) {
      setInsufficientFunds(false);
      return;
    }
    const bal = parseFloat(user.usdtBalance !== undefined && user.usdtBalance !== null && user.usdtBalance !== '' ? user.usdtBalance : '0');
    const fee = isNativeLudo
      ? parseFloat(initialLudo2pEntry || entryPool || '1.00')
      : parseFloat(entryPool || '1.00');

    if (!isNaN(fee) && bal < fee) {
      setInsufficientFunds(true);
      setToastAlert({
        text: `❌ Insufficient LXT balance! Entry fee is ${fee.toFixed(2)} LXT, but your balance is ${bal.toFixed(2)} LXT. Game cannot start.`,
        type: 'error',
      });
    } else if (!isNaN(fee) && bal >= fee) {
      setInsufficientFunds(false);
    }
  }, [user?.usdtBalance, entryPool, initialLudo2pEntry, isNativeLudo, isDailyChallenge, isRoundDeducted]);

  // Core Deduction Function: Triggered ONLY when return status is 'start' and NOT in daily challenge
  const handleGameStartDeduction = async (isRestart = false, force = false, feeOverride = null) => {
    if (!game) return;

    // Strict Daily Challenge Guard: NEVER deduct money for challenge or chess free moves
    if ((isDailyChallengeRef.current || isChessFreeModeRef.current) && !force) {
      console.log('user start challenge / chess free moves');
      console.log('%c🌟 [DEDUCTION ABORTED] Free Play Mode is active (0 LXT deducted)', 'background: #38BDF8; color: #000; font-weight: bold;');
      return;
    }

    // In Chess: If free moves mode is active, do not deduct unless force=true
    const isChessGame = Boolean(gameId?.includes('chess') || game?.id?.includes('chess'));
    if (isChessGame && (isChessFreeModeRef.current || isDailyChallengeRef.current) && !force) {
      console.log('%c♟️ [CHESS DEDUCTION HELD] Free practice mode active.', 'background: #FFB300; color: #000; font-weight: bold;');
      return;
    }

    if (!user?.walletAddress) {
      console.warn('[GamePlay: Start] User wallet address not found.');
      return;
    }

    if (!force && (isRoundDeductedRef.current || isDeductingRef.current)) {
      console.log('[GamePlay: Start] Round entry already deducted or in progress.');
      return;
    }

    const fee = feeOverride !== null && feeOverride !== undefined && !isNaN(parseFloat(feeOverride))
      ? parseFloat(feeOverride)
      : parseFloat(entryPool);
    const balance = parseFloat(user.usdtBalance !== undefined && user.usdtBalance !== null && user.usdtBalance !== '' ? user.usdtBalance : '0');

    if (balance < fee) {
      setInsufficientFunds(true);
      setToastAlert({
        text: `❌ Insufficient LXT balance! Entry fee is ${fee.toFixed(2)} LXT, but your balance is ${balance.toFixed(2)} LXT. Game cannot start.`,
        type: 'error',
      });
      return;
    }

    isDeductingRef.current = true;
    setIsDeducting(true);

    try {
      console.log(`[GamePlay: Start] Return status 'start' confirmed. Deducting entry fee of ${fee} LXT for game: ${gameId}`);
      const res = await api.deductGameEntry(user.walletAddress, gameId, fee, game?.title || null);

      if (res.success) {
        lastDeductedAmountRef.current = fee;
        updateBalance(res.newBalance);
        setIsRoundDeducted(true);
        isRoundDeductedRef.current = true;
        setRoundStatus('started');
        setInsufficientFunds(false);

        setToastAlert({
          text: isRestart
            ? `🔄 Round Restarted! (Status: start) - Deducted -${fee.toFixed(2)} LXT (Balance: ${res.newBalance} LXT)`
            : `🎮 Game Started! Return status: 'start' -> Deducted -${fee.toFixed(2)} LXT (Balance: ${res.newBalance} LXT)`,
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
      console.log(`[GamePlay: Over] Condition 1 (Score ${score} >= ${target}) & Condition 2 (Game Over) MET! Crediting ${prize} LXT...`);
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
        const gross = res.grossReward || prize;
        const cut = res.deductionAmount || (parseFloat(gross) * 0.25).toFixed(2);
        const net = res.netReward || res.prizeCredited || (parseFloat(gross) * 0.75).toFixed(2);

        setGameResult({
          won: true,
          score,
          threshold: target,
          prize: net,
          grossPrize: gross,
          deductionAmount: cut,
          netReward: net,
          condition1Passed: true,
          condition2Passed: true,
          newBalance: res.newBalance,
          time: new Date().toLocaleTimeString(),
        });

        setToastAlert({
          text: `🎉 REWARD CLAIMED! Gross: ${gross} LXT | -25% Cut: -${cut} LXT | +${net} LXT (75%) credited to balance!`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('[Credit Prize Error]', err);
      isPrizeAwardedRef.current = false;
    }
  };

  // Central Game Event Processor: Evaluates Return Status 'start' and the Two Reward Conditions
  // Central Game Event Processor: Evaluates Return Status 'start', Daily Challenge, and Two Reward Conditions
  const processGameEvent = (parsed, rawData) => {
    if (!parsed) return;

    // Detect Sudoku / Gamezop Daily Challenge events:
    // Handles object format: { eventId: 'challenge_started', value: 0 }, { eventKey: 'challenge_started' }, etc.
    // Handles string format: "info/GameAnalytics: Add DESIGN event: {eventId:challenge_started, value:0}"
    const rawDataStr = typeof rawData === 'string' ? rawData.toLowerCase() : '';
    const parsedStr = typeof parsed === 'string' ? parsed.toLowerCase() : '';

    const rawEventId = String(
      parsed?.eventId ??
      parsed?.event_id ??
      parsed?.eventID ??
      parsed?.eventKey ??
      parsed?.event_key ??
      parsed?.data?.eventId ??
      parsed?.data?.eventKey ??
      parsed?.payload?.eventId ??
      ''
    ).toLowerCase().trim();

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
    let jsonStr = '';
    try {
      jsonStr = typeof parsed === 'object' && parsed !== null ? JSON.stringify(parsed).toLowerCase() : '';
    } catch (_) {}

    const isChallengeEvent =
      rawDataStr.includes('challenge') ||
      parsedStr.includes('challenge') ||
      jsonStr.includes('challenge') ||
      rawEventId.includes('challenge') ||
      stateStr.includes('challenge');

    // Detect Chess 2-moves, 3-moves, and 4-moves events (Free Play Mode — No entry deduction from wallet)
    // Game returns: 'session:menu:click:mode:2:level_1' (2 moves), 'session:menu:click:mode:3:level_1' (3 moves), 'session:menu:click:mode:4:level_1' (4 moves)
    const chessModeMatch =
      (rawDataStr + ' ' + parsedStr + ' ' + jsonStr + ' ' + rawEventId).match(/(?:session:menu:click:)?mode[:_]([234])/i);

    const isChessFreeMovesEvent =
      Boolean(chessModeMatch) ||
      rawDataStr.includes('session:menu:click:mode:2') ||
      jsonStr.includes('session:menu:click:mode:2') ||
      rawDataStr.includes('session:menu:click:mode:3') ||
      jsonStr.includes('session:menu:click:mode:3') ||
      rawDataStr.includes('session:menu:click:mode:4') ||
      jsonStr.includes('session:menu:click:mode:4') ||
      rawEventId.includes('mode:2') || rawEventId.includes('mode_2') ||
      rawEventId.includes('mode:3') || rawEventId.includes('mode_3') ||
      rawEventId.includes('mode:4') || rawEventId.includes('mode_4');

    if (isChallengeEvent) {
      console.log('user start challenge');
      console.log(
        '%c🎯 [SUDOKU DAILY CHALLENGE DETECTED] user start challenge',
        'background: #00E676; color: #000; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;'
      );
      setIsDailyChallenge(true);
      isDailyChallengeRef.current = true;
      setRoundStatus('started');
      setToastAlert({
        text: '🌟 Sudoku Daily Challenge Activated! Free Play Mode: No entry fee deducted from your wallet.',
        type: 'info',
      });
      return;
    }

    if (isChessFreeMovesEvent) {
      const combined = `${rawDataStr} ${parsedStr} ${jsonStr} ${rawEventId}`;
      const modeNum = chessModeMatch ? chessModeMatch[1] : (
        combined.includes('mode:3') || combined.includes('mode_3') ? '3' :
        combined.includes('mode:4') || combined.includes('mode_4') ? '4' : '2'
      );
      console.log(`user start free mode: chess mode ${modeNum}`);
      console.log(
        `%c♟️ [CHESS MODE ${modeNum} DETECTED] {eventKey: session:menu:click:mode:${modeNum}:level_1} Free Play Mode — No entry fee will be deducted.`,
        'background: #0284C7; color: #FFFFFF; font-weight: 800; padding: 4px 8px; border-radius: 4px;'
      );
      setIsDailyChallenge(true);
      isDailyChallengeRef.current = true;
      isChessFreeModeRef.current = true;
      isChessMode1SelectedRef.current = false;
      setIsRoundDeducted(false);
      isRoundDeductedRef.current = false;
      setRoundStatus('started');

      // Auto-Refund Guard: If money was previously deducted on initial menu load before mode selection, refund it now!
      if (lastDeductedAmountRef.current > 0 && user?.walletAddress) {
        const refundAmt = lastDeductedAmountRef.current;
        lastDeductedAmountRef.current = 0;
        console.log(`%c💸 [CHESS AUTO-REFUND] Refunding ${refundAmt} LXT because player selected free chess mode ${modeNum}.`, 'background: #00E676; color: #000; font-weight: bold;');
        api.depositFunds(user.walletAddress, refundAmt, `Refund: Chess Free Moves Mode (Mode ${modeNum}) Activated`)
          .then((res) => {
            if (res.success) {
              updateBalance(res.newBalance);
              setToastAlert({
                text: `♟️ Chess ${modeNum} Moves (Free Play): ${refundAmt} LXT refunded to your wallet!`,
                type: 'success',
              });
            }
          })
          .catch((err) => console.error('[Chess Refund Error]', err));
      } else {
        setToastAlert({
          text: `♟️ Chess ${modeNum} Moves Practice Mode (Mode ${modeNum}): Free Play! No entry fee deducted from your wallet.`,
          type: 'info',
        });
      }
      return;
    }

    // Detect Chess Quick Match / Paid Game:
    // Event: 'session:menu:click:quickgame' or { eventId: 'session:menu:click:quickgame', value: 0 }
    const isQuickGameEvent =
      rawEventId.includes('quickgame') ||
      rawEventId.includes('quickmatch') ||
      rawDataStr.includes('quickgame') ||
      rawDataStr.includes('quickmatch') ||
      jsonStr.includes('quickgame') ||
      jsonStr.includes('quickmatch') ||
      rawDataStr.includes('session:menu:click:quickgame') ||
      jsonStr.includes('session:menu:click:quickgame');

    if (isQuickGameEvent) {
      console.log('user start quickgame: paid match');
      console.log(
        '%c♟️ [CHESS QUICK MATCH DETECTED] {eventId: session:menu:click:quickgame} Paid Match — Deducting entry fee, prize pool rewards enabled.',
        'background: #00E676; color: #000; font-weight: 900; font-size: 14px; padding: 4px 8px; border-radius: 4px;'
      );
      setIsDailyChallenge(false);
      isDailyChallengeRef.current = false;
      isChessFreeModeRef.current = false;
      isChessMode1SelectedRef.current = true;
      setIsRoundDeducted(false);
      isRoundDeductedRef.current = false;
      isDeductingRef.current = false;
      setRoundStatus('started');

      handleGameStartDeduction(false, true);
      return;
    }

    // Helper to detect Normal Play: In Chess, Mode 1 or Quick Game resets to normal paid play!
    const isChessGame = Boolean(gameId?.includes('chess') || game?.id?.includes('chess'));
    const isNormalPlayEvent = isChessGame
      ? (/(?:session:menu:click:)?mode[:_]1(?::|$)/i.test(rawDataStr + ' ' + jsonStr + ' ' + rawEventId) ||
         isQuickGameEvent)
      : (
          rawEventId === 'normal_started' ||
          rawEventId === 'classic_started' ||
          rawEventId === 'difficulty_selected' ||
          rawEventId.includes('normal') ||
          rawEventId.includes('classic')
        );

    if (isNormalPlayEvent) {
      console.log('%c🎮 [NORMAL PLAY DETECTED] Setting to Normal Play Mode (Entry fee will be deducted on start).', 'background: #00E676; color: #000; font-weight: bold;');
      setIsDailyChallenge(false);
      isDailyChallengeRef.current = false;
      if (isChessGame) {
        isChessMode1SelectedRef.current = true;
        isChessFreeModeRef.current = false;
      }
    }

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
        isDailyChallenge: isDailyChallengeRef.current,
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

    // If reload/restart occurs OR if previous round was over (win OR lose) and a new start arrives:
    // Age stale state-er karone harle reset hoto na — restart-e taka katto na (bug fix)
    if (isReloadOrRestart || ((gameOverRef.current || isPrizeAwardedRef.current || gameResultRef.current) && isStart)) {
      console.log('%c🔄 [RELOAD / NEW ROUND DETECTED] Resetting round state...', 'background: #FFB300; color: #000; font-weight: bold;');
      setIsRoundDeducted(false);
      isRoundDeductedRef.current = false;
      isPrizeAwardedRef.current = false;
      gameOverRef.current = false;
      gameResultRef.current = null;
      setCurrentScore(0);
      currentScoreRef.current = 0;
      setIsGameOver(false);
      setRoundStatus('idle');
      setGameResult(null);
      // isDailyChallenge is preserved during reload/restart of challenge mode
    }

    // =========================================================================
    // 1. DEDUCTION RULE:
    // When Daily Challenge is active: DO NOT DEDUCT (Free Play Mode).
    // When Normal Play is active: Deduct entry pool fee strictly on status 'start'.
    // =========================================================================
    if (isStart) {
      if (isDailyChallengeRef.current) {
        console.log(
          '%c🌟 [DAILY CHALLENGE ACTIVE - FREE PLAY] Skipping wallet entry pool deduction for daily challenge round.',
          'background: #38BDF8; color: #000; font-weight: bold;'
        );
        setRoundStatus('started');
        setToastAlert({
          text: '🌟 Daily Challenge Mode Active: Free Play round! No entry fee deducted from your wallet.',
          type: 'info',
        });
      } else {
        console.log(
          '%c🚀 [NORMAL PLAY: RETURN STATUS START DETECTED] Deducting money from account for round...',
          'background: #39FF88; color: #000; font-weight: bold;'
        );
        if (!isRoundDeductedRef.current) {
          const customEntryFee = parsed?.entryFee !== undefined ? parsed.entryFee : (parsed?.data?.entryFee || null);
          handleGameStartDeduction(isReloadOrRestart, false, customEntryFee);
        }
      }
    }

    // =========================================================================
    // 2. REWARD RULES: Evaluate TWO Conditions:
    //    Condition 1: Exceed score or not? (score >= thresholdScore)
    //    Condition 2: Check game over or not? (isGameOver === true)
    // =========================================================================
    if (condition2_isGameOver) {
      setIsGameOver(true);
      gameOverRef.current = true; // win hok ba lose — porer 'start'-e notun round deduct hobe
      setRoundStatus('over');

      // Check if event explicitly passed won flag (e.g. from Ludo where winner is red or bot)
      const explicitWon = parsed?.won !== undefined ? Boolean(parsed.won) : (parsed?.data?.won !== undefined ? Boolean(parsed.data.won) : null);
      const isWinner = explicitWon !== null ? explicitWon : condition1_exceededScore;
      const actualPrize = parsed?.prizeAmount !== undefined && !isNaN(parseFloat(parsed.prizeAmount))
        ? parseFloat(parsed.prizeAmount)
        : (parsed?.prize !== undefined && !isNaN(parseFloat(parsed.prize))
          ? parseFloat(parsed.prize)
          : (parsed?.data?.prize !== undefined && !isNaN(parseFloat(parsed.data.prize)) ? parseFloat(parsed.data.prize) : prize));

      console.log(
        '%c🏁 [GAME OVER DETECTED - EVALUATING CONDITIONS]',
        'background: #FFD700; color: #000; font-weight: bold; font-size: 13px;',
        {
          'Winner Status': isWinner ? 'WINNER ✅' : 'RUNNER UP / FAILED ❌',
          'Condition 2 (Game Over)': 'PASSED ✅',
          finalScore: updatedScore,
          targetThreshold: target,
          prizeReward: actualPrize,
        }
      );

      // Condition 1 (Winner / Score Exceeded) AND Condition 2 (Game Over)
      if (isWinner) {
        handlePrizeWon(updatedScore, target, actualPrize);
      } else {
        // Did not win 1st place -> No prize awarded!
        setGameResult({
          won: false,
          score: updatedScore,
          threshold: target,
          prize: actualPrize,
          condition1Passed: false,
          condition2Passed: true,
          time: new Date().toLocaleTimeString(),
        });

        setToastAlert({
          text: explicitWon === false
            ? `🏁 Match Over! An opponent finished first. Prize given to 1st place only.`
            : `🏁 Game Over! Condition 1 Failed: Score ${updatedScore} did not exceed target ${target} PTS. No prize reward.`,
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

      console.log('%c📨 [GAME MESSAGE EVENT]', 'background: #2563EB; color: #fff; font-weight: bold;', event.data);

      let parsed = event.data;
      if (typeof event.data === 'string') {
        try {
          parsed = JSON.parse(event.data);
        } catch (_) {
          parsed = event.data;
        }
      }

      // Immediate check for challenge event at listener entry
      const msgStr = typeof event.data === 'string' ? event.data.toLowerCase() : '';
      let msgJson = '';
      try {
        msgJson = typeof event.data === 'object' && event.data !== null ? JSON.stringify(event.data).toLowerCase() : '';
      } catch (_) {}

      if (msgStr.includes('challenge') || msgJson.includes('challenge')) {
        console.log('user start challenge');
        console.log('%c🎯 [ENTRY DETECTED] user start challenge', 'background: #00E676; color: #000; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;');
        setIsDailyChallenge(true);
        isDailyChallengeRef.current = true;
      }

      // Immediate check for chess moves mode (2 moves, 3 moves, 4 moves) at listener entry
      const chessEntryMatch = (msgStr + ' ' + msgJson).match(/(?:session:menu:click:)?mode[:_]([234])/i);
      if (
        chessEntryMatch ||
        msgStr.includes('session:menu:click:mode:2') || msgJson.includes('session:menu:click:mode:2') ||
        msgStr.includes('session:menu:click:mode:3') || msgJson.includes('session:menu:click:mode:3') ||
        msgStr.includes('session:menu:click:mode:4') || msgJson.includes('session:menu:click:mode:4')
      ) {
        const modeNum = chessEntryMatch ? chessEntryMatch[1] : '2/3/4';
        console.log(`user start free mode: chess mode ${modeNum}`);
        console.log(`%c♟️ [ENTRY DETECTED] user start free mode: chess mode ${modeNum} (${modeNum} Moves - No money deducted)`, 'background: #0284C7; color: #fff; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;');
        setIsDailyChallenge(true);
        isDailyChallengeRef.current = true;
        isChessFreeModeRef.current = true;
        isChessMode1SelectedRef.current = false;
      }

      // Immediate check for quick match / quickgame
      const isQuickGame =
        msgStr.includes('quickgame') ||
        msgJson.includes('quickgame') ||
        msgStr.includes('quickmatch') ||
        msgJson.includes('quickmatch') ||
        msgStr.includes('session:menu:click:quickgame') ||
        msgJson.includes('session:menu:click:quickgame');

      if (isQuickGame) {
        console.log('user start quickgame: paid match');
        console.log(
          '%c♟️ [ENTRY DETECTED] Chess Quick Match - Paid Match (Entry fee will be deducted, rewards active)',
          'background: #00E676; color: #000; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;'
        );
        setIsDailyChallenge(false);
        isDailyChallengeRef.current = false;
        isChessFreeModeRef.current = false;
        isChessMode1SelectedRef.current = true;
      }

      processGameEvent(parsed, event.data);
    };

    window.addEventListener('message', handleGameMessage);

    // Also wire console interceptor in case GameAnalytics logs info directly to console
    const originalLog = console.log;
    const originalInfo = console.info;

    const checkLogArgs = (...args) => {
      try {
        const text = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
        if (text.toLowerCase().includes('challenge')) {
          originalLog.apply(console, ['user start challenge']);
          originalLog.apply(console, ['%c🎯 [CONSOLE LOG DETECTED] user start challenge', 'background: #00E676; color: #000; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;']);
          setIsDailyChallenge(true);
          isDailyChallengeRef.current = true;
          processGameEvent({ eventId: 'challenge_started' }, text);
        }
        const chessLogMatch = text.toLowerCase().match(/(?:session:menu:click:)?mode[:_]([234])/i);
        if (
          chessLogMatch ||
          text.toLowerCase().includes('session:menu:click:mode:2') ||
          text.toLowerCase().includes('session:menu:click:mode:3') ||
          text.toLowerCase().includes('session:menu:click:mode:4')
        ) {
          const modeNum = chessLogMatch ? chessLogMatch[1] : '2';
          originalLog.apply(console, [`user start free mode: chess mode ${modeNum}`]);
          originalLog.apply(console, [`%c♟️ [CONSOLE LOG DETECTED] Chess Mode ${modeNum} (${modeNum} Moves) - Free Play (0 LXT)`, 'background: #0284C7; color: #fff; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;']);
          setIsDailyChallenge(true);
          isDailyChallengeRef.current = true;
          isChessFreeModeRef.current = true;
          isChessMode1SelectedRef.current = false;
          processGameEvent({ eventKey: `session:menu:click:mode:${modeNum}:level_1` }, text);
        }
        if (
          text.toLowerCase().includes('quickgame') ||
          text.toLowerCase().includes('quick_game') ||
          text.toLowerCase().includes('quickmatch') ||
          text.toLowerCase().includes('session:menu:click:quickgame')
        ) {
          originalLog.apply(console, ['user start quickgame: paid match']);
          originalLog.apply(console, [
            '%c♟️ [CONSOLE LOG DETECTED] Chess Quick Match / Normal Mode - Paid Match (Entry fee deducted, rewards active)',
            'background: #00E676; color: #000; font-weight: 900; font-size: 16px; padding: 4px 10px; border-radius: 4px;'
          ]);
          setIsDailyChallenge(false);
          isDailyChallengeRef.current = false;
          isChessFreeModeRef.current = false;
          isChessMode1SelectedRef.current = true;
          setIsRoundDeducted(false);
          isRoundDeductedRef.current = false;
          isDeductingRef.current = false;
          processGameEvent({ eventId: 'session:menu:click:quickgame', state: 'start' }, text);
        }
      } catch (_) {}
    };

    console.log = (...args) => {
      originalLog.apply(console, args);
      checkLogArgs(...args);
    };
    console.info = (...args) => {
      originalInfo.apply(console, args);
      checkLogArgs(...args);
    };

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
      console.log = originalLog;
      console.info = originalInfo;
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
    const bal = parseFloat(user?.usdtBalance !== undefined && user?.usdtBalance !== null && user?.usdtBalance !== '' ? user.usdtBalance : '0');
    const fee = isNativeLudo
      ? parseFloat(initialLudo2pEntry || entryPool || '1.00')
      : parseFloat(entryPool || '1.00');

    if (!isDailyChallenge && bal < fee) {
      setInsufficientFunds(true);
      setToastAlert({
        text: `❌ Insufficient LXT balance! Entry fee is ${fee.toFixed(2)} LXT, but your balance is ${bal.toFixed(2)} LXT. Game cannot restart.`,
        type: 'error',
      });
      return;
    }

    console.log('[GamePlay] User clicked Restart: Resetting round and waiting for status start');
    setIsDailyChallenge(false);
    isDailyChallengeRef.current = false;
    setIsRoundDeducted(false);
    isRoundDeductedRef.current = false;
    isPrizeAwardedRef.current = false;
    gameOverRef.current = false;
    gameResultRef.current = null;
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
          {/* Mode & Entry Status: Free for Daily Challenge, Deducts on start for Normal Play */}
          <div
            className="hud-pool-badge entry-badge"
            title={isDailyChallenge ? 'Daily Challenge: Free Play Mode — No Entry Fee Deducted' : "Normal Play: Entry fee deducted only when game returns status 'start'"}
            style={{
              borderColor: isDailyChallenge ? '#38BDF8' : isRoundDeducted ? '#00E676' : 'rgba(255,255,255,0.2)',
              background: isDailyChallenge ? 'rgba(56, 189, 248, 0.15)' : undefined,
            }}
          >
            <span className="hud-badge-label">{isDailyChallenge ? (gameId?.includes('chess') ? '♟️ Chess:' : '🌟 Mode:') : `Entry (${entryPool} LXT):`}</span>
            <span
              className="hud-badge-value"
              style={{ color: isDailyChallenge ? '#38BDF8' : isRoundDeducted ? '#39FF88' : '#cbd5e1', fontWeight: 700 }}
            >
              {isDailyChallenge ? (gameId?.includes('chess') ? 'Free Moves Mode (0 LXT)' : 'Free Challenge (0 LXT)') : isRoundDeducted ? '✅ Deducted' : '⏳ Awaiting Start'}
            </span>
          </div>

          {isDailyChallenge && (
            <button
              onClick={() => {
                setIsDailyChallenge(false);
                isDailyChallengeRef.current = false;
                setToastAlert({ text: 'Switched to Normal Play mode. Entry fee will be deducted on round start.', type: 'info' });
              }}
              className="fullscreen-hud-btn"
              style={{ background: 'rgba(0, 230, 118, 0.15)', borderColor: '#00E676', color: '#00E676', fontSize: '0.72rem', padding: '3px 8px', fontWeight: 700 }}
              title="Switch back to Normal Paid Mode"
            >
              🎮 Play Normal Mode
            </button>
          )}

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
            <span className="hud-badge-value">{prizePool} LXT</span>
          </div>

          {/* User Balance */}
          <div className="hud-pool-badge balance-badge" title="Your Live Account Balance">
            <Wallet size={13} color="#39FF88" />
            <span className="hud-badge-label">Balance:</span>
            <span className="hud-badge-value">{user?.usdtBalance || '0.00'} LXT</span>
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
            onClick={() => {
              processGameEvent(
                { eventId: 'challenge_started', value: 0 },
                'info/GameAnalytics: Add DESIGN event: {eventId:challenge_started, value:0}'
              );
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', color: '#38BDF8', fontWeight: 800 }}
            title="Simulate Sudoku Daily Challenge Selection ({eventId:challenge_started}) -> Free Play (No Entry Deduction)"
          >
            🌟 Daily Challenge ({'{eventId:challenge_started}'})
          </button>
          <button
            onClick={() => {
              processGameEvent(
                { eventType: 'design_event', eventKey: 'session:menu:click:mode:2:level_1', value: 0 },
                "Sending design event {eventType: 'design_event', eventKey: 'session:menu:click:mode:2:level_1', value: 0}"
              );
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', color: '#38BDF8', fontWeight: 800 }}
            title="Simulate Chess 2-Moves Selection ({eventKey: 'session:menu:click:mode:2:level_1'}) -> Free Play (No Entry Deduction)"
          >
            ♟️ 2-Moves (Mode 2)
          </button>
          <button
            onClick={() => {
              processGameEvent(
                { eventType: 'design_event', eventKey: 'session:menu:click:mode:3:level_1', value: 0 },
                "Sending design event {eventType: 'design_event', eventKey: 'session:menu:click:mode:3:level_1', value: 0}"
              );
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', color: '#38BDF8', fontWeight: 800 }}
            title="Simulate Chess 3-Moves Selection ({eventKey: 'session:menu:click:mode:3:level_1'}) -> Free Play (No Entry Deduction)"
          >
            ♟️ 3-Moves (Mode 3)
          </button>
          <button
            onClick={() => {
              processGameEvent(
                { eventType: 'design_event', eventKey: 'session:menu:click:mode:4:level_1', value: 0 },
                "Sending design event {eventType: 'design_event', eventKey: 'session:menu:click:mode:4:level_1', value: 0}"
              );
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38BDF8', color: '#38BDF8', fontWeight: 800 }}
            title="Simulate Chess 4-Moves Selection ({eventKey: 'session:menu:click:mode:4:level_1'}) -> Free Play (No Entry Deduction)"
          >
            ♟️ 4-Moves (Mode 4)
          </button>
          <button
            onClick={() => {
              processGameEvent(
                { eventType: 'design_event', eventId: 'session:menu:click:quickgame', value: 0 },
                'Info/GameAnalytics: Add DESIGN event: {eventId:session:menu:click:quickgame, value:0}'
              );
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(0, 230, 118, 0.25)', borderColor: '#00E676', color: '#00E676', fontWeight: 800 }}
            title="Simulate Chess Quick Game Selection ({eventId: 'session:menu:click:quickgame'}) -> Paid Match (Deducts Entry Fee & Rewards Active)"
          >
            ♟️ Quick Game (Paid Match)
          </button>
          <button
            onClick={() => processGameEvent({ state: 'start' })}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#00E676', color: '#000', borderColor: '#00E676', fontWeight: 800 }}
            title="Simulate game returning status 'start' (Deducts in Normal Mode, Skips in Daily Challenge)"
          >
            1. Trigger Status 'start' {isDailyChallenge ? '(Free Play: 0 LXT)' : `(-${entryPool} LXT)`}
          </button>
          <button
            onClick={() => {
              setIsDailyChallenge(false);
              isDailyChallengeRef.current = false;
              setToastAlert({ text: 'Mode set to Normal Play. Entry fee will be deducted on round start.', type: 'info' });
            }}
            className="fullscreen-hud-btn"
            style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)', fontWeight: 700 }}
            title="Reset to Normal Play Mode"
          >
            🎮 Set Normal Mode
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
            4. Both Conditions Met (Score {targetNum + 100} &plus; Over &rarr; +{prizePool} LXT)
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
            5. In-Game Reload &rarr; State 'start' (-{entryPool} LXT)
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
                  Both conditions satisfied! Gross: {gameResult.grossPrize || gameResult.prize} LXT | -25% Platform Cut: -{gameResult.deductionAmount || '0.00'} LXT | +{gameResult.netReward || gameResult.prize} LXT (75%) credited to your account!
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Condition 1 was not satisfied. Prize pool of {gameResult.prize} LXT requires score &ge; {gameResult.threshold} PTS.
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
              <span>Entry Fee: <strong style={{ color: '#FFFFFF' }}>{entryPool} LXT</strong></span>
              <span>Target Score: <strong style={{ color: '#FFB300' }}>{thresholdScore} PTS</strong></span>
              <span>Prize Pool: <strong style={{ color: '#00E676' }}>{prizePool} LXT</strong></span>
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
            <h3>Insufficient LXT Balance</h3>
            <p>
              Entering the <strong>{game.title}</strong> prize pool requires an entry fee of{' '}
              <strong style={{ color: '#00E676' }}>{entryPool} LXT</strong>.
            </p>
            <div className="game-insufficient-meta">
              <span>Required: <strong style={{ color: '#FFFFFF' }}>{entryPool} LXT</strong></span>
              <span>Your Balance: <strong style={{ color: '#FF5252' }}>{user?.usdtBalance || '0.00'} LXT</strong></span>
            </div>
            <div style={{ color: '#FFB300', fontWeight: 600, fontSize: '0.95rem', margin: '10px 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span>⚠️ Add token in your wallet</span>
            </div>
            <div className="game-insufficient-actions">
              <Link to="/games" className="fullscreen-hud-btn">
                <ArrowLeft size={14} />
                <span>Back to Lobby</span>
              </Link>
            </div>
          </div>
        </div>
      )}



      {/* Game Iframe or Native Game Board */}
      {user?.walletAddress && !insufficientFunds && (
        <div className="fullscreen-iframe-wrapper">
          {game?.playableType === 'native-ludo' || gameId === 'ludo-with-friends' || gameId === 'ludo-dash' || gameId === 'ludo' ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflowY: 'auto' }}>
              <LudoGameBoard
                onGameEvent={processGameEvent}
                entryPool={entryPool}
                prizePool={prizePool}
                thresholdScore={thresholdScore}
                ludo2pEntryPool={initialLudo2pEntry}
                ludo2pPrizePool={initialLudo2pPrize}
                ludo4pEntryPool={initialLudo4pEntry}
                ludo4pPrizePool={initialLudo4pPrize}
              />
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="gz-iframe-loader fullscreen-loader">
                  <div className="gz-spinner" />
                  <h4>Loading {game?.title || 'Game'}...</h4>
                  <p>Connecting to Gamezop CDN HTML5 engine</p>
                </div>
              )}
              <iframe
                key={iframeKey}
                src={iframeSrc}
                title={game?.title || 'Game'}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
