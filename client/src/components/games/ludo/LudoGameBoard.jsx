import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getLudoSocket, getStablePlayerId } from '../../../services/ludoSocket';
import styles from './LudoGameBoard.module.css';
import {
  PLAYER_COLORS,
  FOUR_PLAYER_COLORS,
  TWO_PLAYER_COLORS,
  COLOR_HEX,
  BOARD_COLORS,
  GRID_MAP,
  CELL_TO_POS,
  SAFE_SQUARES,
  HOME_GOALS,
  START_SQUARES,
  ARROW_CELLS,
  homeColorForPos,
  startColorForPos,
  createInitialPawns,
  canPawnMove,
  getPositionAfterMove,
} from './ludoConstants';

import trophyImageSrc from '../../../assets/ludo/trophy.webp';

// Dice images
import dice1 from '../../../assets/ludo/dice/1.png';
import dice2 from '../../../assets/ludo/dice/2.png';
import dice3 from '../../../assets/ludo/dice/3.png';
import dice4 from '../../../assets/ludo/dice/4.png';
import dice5 from '../../../assets/ludo/dice/5.png';
import dice6 from '../../../assets/ludo/dice/6.png';
import diceRollIcon from '../../../assets/ludo/dice/roll.png';

const DICE_IMAGES = [dice1, dice2, dice3, dice4, dice5, dice6];

// Seconds allowed for every player's turn (roll + move)
const TURN_DURATION = 15;

// Hopping pace: milliseconds spent on each square while a pawn travels
const STEP_MS = 250;

// Player Labels
const PLAYER_LABELS = {
  yellow: 'Computer 3 (Yellow)',
  blue: 'Computer 4 (Blue)',
  green: 'Computer 2 (Green)',
  red: 'You (Red)',
};

// Player Avatar Icons
const PLAYER_ICONS = {
  yellow: '⚡',
  blue: '🛡️',
  green: '🍀',
  red: '👑',
};

// Base quadrants: which color owns each 6x6 corner
function baseColorForCell(r, c) {
  if (r <= 5 && c <= 5) return 'yellow';
  if (r <= 5 && c >= 9) return 'blue';
  if (r >= 9 && c <= 5) return 'green';
  if (r >= 9 && c >= 9) return 'red';
  return null;
}

// White-box overlay placement per base (1-indexed grid lines)
const BASE_BOX_PLACEMENT = {
  yellow: { gridRow: '2 / 6', gridColumn: '2 / 6' },
  blue: { gridRow: '2 / 6', gridColumn: '11 / 15' },
  green: { gridRow: '11 / 15', gridColumn: '2 / 6' },
  red: { gridRow: '11 / 15', gridColumn: '11 / 15' },
};

const BASE_OFFSETS = { red: 0, blue: 4, green: 8, yellow: 12 };

function isCenterCell(r, c) {
  return r >= 6 && r <= 8 && c >= 6 && c <= 8;
}

export default function LudoGameBoard({
  onGameEvent,
  entryPool = '1.00',
  prizePool = '100.00',
  thresholdScore = '500',
  ludo2pEntryPool = '1.00',
  ludo2pPrizePool = '20.00',
  ludo4pEntryPool = '2.00',
  ludo4pPrizePool = '50.00',
}) {
  const { user } = useAuth();

  // Mode selection: 2 (1v1) or 4 (classic)
  const [playerMode, setPlayerMode] = useState(2);
  // User must explicitly select 2 or 4 players before loading / matchmaking
  const [selectedModeConfirmed, setSelectedModeConfirmed] = useState(false);

  // Player Name State (Saved in localStorage and MongoDB database)
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('ludo_player_name') || user?.ludoPlayerName || '';
  });
  const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
  const [nameInputVal, setNameInputVal] = useState('');
  const [nameError, setNameError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  const [pendingMode, setPendingMode] = useState(null);

  // If first time playing (no name in storage or user profile), prompt for name
  useEffect(() => {
    const saved = localStorage.getItem('ludo_player_name') || user?.ludoPlayerName;
    if (!saved) {
      setIsNamePromptOpen(true);
    }
  }, [user]);

  // Fetch / Sync Ludo player name from database
  useEffect(() => {
    if (user?.ludoPlayerName && !playerName) {
      setPlayerName(user.ludoPlayerName);
      localStorage.setItem('ludo_player_name', user.ludoPlayerName);
    } else if (user?.walletAddress && !playerName) {
      fetch(`/api/games/ludo/player-name/${user.walletAddress}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.success && data?.name) {
            setPlayerName(data.name);
            localStorage.setItem('ludo_player_name', data.name);
          }
        })
        .catch(() => {});
    }
  }, [user, playerName]);

  const handleSavePlayerName = async (e) => {
    e?.preventDefault();
    const clean = (nameInputVal || '').trim();
    if (!clean) {
      setNameError('Please enter your player name');
      return;
    }
    if (clean.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setPlayerName(clean);
    localStorage.setItem('ludo_player_name', clean);
    setIsNamePromptOpen(false);
    setNameError('');

    try {
      await fetch('/api/games/ludo/player-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: user?.walletAddress || null,
          name: clean,
        }),
      });
    } catch (_) {}

    if (pendingMode) {
      const modeToStart = pendingMode;
      const requiredFee = parseFloat(modeToStart === 2 ? adminPools.p2Entry : adminPools.p4Entry);
      const userBal = parseFloat(user?.usdtBalance !== undefined && user?.usdtBalance !== null && user?.usdtBalance !== '' ? user.usdtBalance : '0');

      if (!isNaN(requiredFee) && userBal < requiredFee) {
        setBalanceError(
          `❌ Insufficient USDT balance! ${modeToStart}P mode requires ${requiredFee.toFixed(2)} USDT, but your balance is ${userBal.toFixed(2)} USDT. Game cannot start.`
        );
        setPendingMode(null);
        return;
      }
      setPendingMode(null);
      setPlayerMode(modeToStart);
      setSelectedModeConfirmed(true);
      const initial = createInitialPawns(modeToStart);
      setPawns(initial);
      pawnsRef.current = initial;
      startMatchmaking(modeToStart);
    }
  };

  // Pools parents (GamesLobby modal / GamePlay) theke ase — tara database theke ane.
  // Kono localStorage noy: sob browser-e same admin value.
  const [adminPools, setAdminPools] = useState({
    p2Entry: ludo2pEntryPool || '1.00',
    p2Prize: ludo2pPrizePool || '20.00',
    p4Entry: ludo4pEntryPool || '2.00',
    p4Prize: ludo4pPrizePool || '50.00',
  });

  useEffect(() => {
    setAdminPools({
      p2Entry: ludo2pEntryPool || '1.00',
      p2Prize: ludo2pPrizePool || '20.00',
      p4Entry: ludo4pEntryPool || '2.00',
      p4Prize: ludo4pPrizePool || '50.00',
    });
  }, [ludo2pEntryPool, ludo2pPrizePool, ludo4pEntryPool, ludo4pPrizePool]);

  const activeEntryPool = playerMode === 2 ? adminPools.p2Entry : adminPools.p4Entry;
  const activePrizePool = playerMode === 2 ? adminPools.p2Prize : adminPools.p4Prize;

  const activePlayers = useMemo(
    () => (playerMode === 2 ? TWO_PLAYER_COLORS : FOUR_PLAYER_COLORS),
    [playerMode]
  );
  useEffect(() => { activePlayersRef.current = activePlayers; }, [activePlayers]);
  useEffect(() => { activePrizePoolRef.current = activePrizePool; }, [activePrizePool]);

  // Game state
  const [pawns, setPawns] = useState(() => createInitialPawns(2));
  const pawnsRef = useRef(pawns);
  useEffect(() => {
    pawnsRef.current = pawns;
  }, [pawns]);

  const botTurnActiveRef = useRef(false);
  const [currentTurn, setCurrentTurn] = useState('red'); // Red is human player
  const [rolledNumber, setRolledNumber] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION);
  const [lastDiceByColor, setLastDiceByColor] = useState({
    red: null,
    blue: null,
    green: null,
    yellow: null,
  });
  const [winner, setWinner] = useState(null);
  const [score, setScore] = useState(0);
  useEffect(() => { currentScoreRefLive.current = score; }, [score]);
  const [gameStartedNotified, setGameStartedNotified] = useState(false);
  const [actionMessage, setActionMessage] = useState('Choose your tournament mode to start.');

  // Visual Animation States
  const [hoppingPawnId, setHoppingPawnId] = useState(null);
  const [justExitedPawnId, setJustExitedPawnId] = useState(null);
  const [ripplingPos, setRipplingPos] = useState(null);
  const [isBoardShaking, setIsBoardShaking] = useState(false);
  const [knockoutState, setKnockoutState] = useState(null); // { r, c, victimColor, attackerColor }
  const [flyingVictimId, setFlyingVictimId] = useState(null);
  const [knockoutToast, setKnockoutToast] = useState(null);

  // Sound effects generator (Web Audio API)
  const playBeep = (freq, duration, type = 'sine') => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  };

  // Matchmaking State (30-second countdown loading)
  const MATCHMAKING_TOTAL_SECS = 30;
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [searchSecsLeft, setSearchSecsLeft] = useState(MATCHMAKING_TOTAL_SECS);
  const [matchStatus, setMatchStatus] = useState('searching'); // 'searching' | 'live_matched' | 'bot_matched' | 'deducting'
  const [matchedPlayers, setMatchedPlayers] = useState([]);
  const [deductionMessage, setDeductionMessage] = useState(null);
  const queueIdRef = useRef(null);
  const pollTimerRef = useRef(null);
  const searchCountdownRef = useRef(null);

  // ---- LIVE realtime (Socket.io) state: 2 jon same match-e, eke oporer chal live dekhbe ----
  const [myColor, setMyColor] = useState('red');
  const [isLiveMatch, setIsLiveMatch] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const myColorRef = useRef('red');
  const isLiveMatchRef = useRef(false);
  const liveMatchIdRef = useRef(null);
  const socketMatchedRef = useRef(false);
  const suppressBroadcastRef = useRef(false);
  const matchedDoneRef = useRef(false); // socket vs REST race: first match wins (double deduct atkate)
  const socketConnectedRef = useRef(false);
  const remoteAnimToken = useRef(0); // opponent-er visual hop cancel token
  const remoteDiceIntRef = useRef(null); // opponent-er dice tumble interval
  const matchFeeRef = useRef(null); // ei match-er entry fee (server/admin value)
  const matchPrizeRef = useRef(null); // ei match-er prize pool (server/admin value)
  const deductionDispatchedRef = useRef(false);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { isLiveMatchRef.current = isLiveMatch; }, [isLiveMatch]);
  useEffect(() => { liveMatchIdRef.current = liveMatchId; }, [liveMatchId]);

  const broadcastGameAction = useCallback((action) => {
    try {
      const mid = liveMatchIdRef.current;
      if (!isLiveMatchRef.current || !mid) return;
      if (suppressBroadcastRef.current) return;
      const sock = getLudoSocket();
      if (sock?.connected) sock.emit('ludo:game-action', { matchId: mid, ...action });
    } catch (_) {}
  }, []);

  // Refs used inside socket listener (avoid stale closure)
  const playerModeRef = useRef(playerMode);
  useEffect(() => { playerModeRef.current = playerMode; }, [playerMode]);
  const activePlayersRef = useRef(playerMode === 2 ? TWO_PLAYER_COLORS : FOUR_PLAYER_COLORS);
  const onGameEventRef = useRef(onGameEvent);
  useEffect(() => { onGameEventRef.current = onGameEvent; }, [onGameEvent]);
  const activePrizePoolRef = useRef('20');
  const currentScoreRefLive = useRef(0);

  const stopMatchmakingTimers = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (searchCountdownRef.current) {
      clearInterval(searchCountdownRef.current);
      searchCountdownRef.current = null;
    }
  }, []);

  // REST queue theke beriye jao (socket-e match hoye gele REST poll bondho korte)
  const cancelRestQueue = useCallback(() => {
    const qid = queueIdRef.current;
    queueIdRef.current = null;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (qid) {
      try {
        fetch('/api/games/ludo/matchmake/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId: qid }),
        });
      } catch (_) {}
    }
  }, []);

  // Deduct entry fee right before match starts!
  const finalizeAndStartMatch = useCallback(
    (players, status = 'bot_matched', modeVal = playerMode, liveOpts = {}) => {
      // Socket vs REST race guard: prothom match tai final (double deduct + double board atkate)
      if (matchedDoneRef.current) return;
      matchedDoneRef.current = true;
      stopMatchmakingTimers();
      const currentName = playerName || 'You';
      const myC = liveOpts.yourColor || 'red';
      const myPid = liveOpts.myPlayerId || null;
      const decoratedPlayers = players.map((p) => {
        // Nijeke playerId diye chinbo (REST path-e ami red na-ও hote pari — age ekhanei bug chhilo:
        // sobai red-e nijer naam bosiye dito, tai dujoner screen-e naam ulta-palta dekhaito)
        if (liveOpts.isLive && myPid && p.playerId && p.playerId === myPid) return { ...p, name: currentName };
        if (liveOpts.isLive && !myPid && p.color === myC) return { ...p, name: currentName };
        if (!liveOpts.isLive && p.color === 'red') return { ...p, name: currentName };
        return p;
      });
      setMatchedPlayers(decoratedPlayers);
      setMatchStatus(status);
      if (liveOpts.isLive) {
        setIsLiveMatch(true);
        isLiveMatchRef.current = true;
        setMyColor(myC);
        myColorRef.current = myC;
        if (liveOpts.matchId) {
          setLiveMatchId(liveOpts.matchId);
          liveMatchIdRef.current = liveOpts.matchId;
          // REST diye match holeo socket room-e dhuke jao — tahole chal live relay hobe
          try { getLudoSocket()?.emit('ludo:join-room', { matchId: liveOpts.matchId }); } catch (_) {}
        }
        setOpponentLeft(false);
      } else {
        setIsLiveMatch(false);
        isLiveMatchRef.current = false;
        setMyColor('red');
        myColorRef.current = 'red';
        setLiveMatchId(null);
        liveMatchIdRef.current = null;
      }

      const fee = liveOpts.serverFee !== undefined && liveOpts.serverFee !== null && !isNaN(parseFloat(liveOpts.serverFee))
        ? parseFloat(liveOpts.serverFee)
        : parseFloat(modeVal === 2 ? adminPools.p2Entry : adminPools.p4Entry);
      const prize = liveOpts.serverPrize !== undefined && liveOpts.serverPrize !== null && !isNaN(parseFloat(liveOpts.serverPrize))
        ? parseFloat(liveOpts.serverPrize)
        : parseFloat(modeVal === 2 ? adminPools.p2Prize : adminPools.p4Prize);

      // Ei match-er authoritative fee/prize mone rakho — winner prize ekhan thekei asbe (hardcode noy)
      matchFeeRef.current = fee;
      matchPrizeRef.current = prize;

      const userBal = parseFloat(user?.usdtBalance !== undefined && user?.usdtBalance !== null && user?.usdtBalance !== '' ? user.usdtBalance : '0');
      if (!deductionDispatchedRef.current && !isNaN(fee) && userBal < fee) {
        stopMatchmakingTimers();
        matchedDoneRef.current = false;
        setIsMatchmaking(false);
        setSelectedModeConfirmed(false);
        setBalanceError(
          `❌ Insufficient USDT balance! Match entry fee is ${fee.toFixed(2)} USDT, but your balance is ${userBal.toFixed(2)} USDT. Game cannot start.`
        );
        return;
      }
      deductionDispatchedRef.current = true;

      // Deduct entry fee right before the match starts!
      setDeductionMessage(`💳 Deducting Entry Fee: -${fee.toFixed(2)} USDT... Match starting!`);
      if (onGameEvent) {
        onGameEvent({
          state: 'start',
          entryFee: fee,
          prizePool: prize,
          mode: modeVal,
          gameType: 'ludo',
        });
      }

      playBeep(580, 0.25, 'triangle');

      setTimeout(() => {
        setIsMatchmaking(false);
        setDeductionMessage(null);
        setGameStartedNotified(true);
        setActionMessage(`Match started (${modeVal} Players)! Prize Pool: ${prize.toFixed(2)} USDT to 1st Winner. Tap dice to roll.`);
      }, 1400);
    },
    [adminPools, onGameEvent, playerMode, playerName, stopMatchmakingTimers]
  );

  const fallbackToBot = useCallback(
    async (modeVal) => {
      stopMatchmakingTimers();
      try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
      let botPlayers = [];
      let serverFee;
      let serverPrize;
      const currentName = playerName || 'You';
      try {
        const res = await fetch('/api/games/ludo/matchmake/fallback-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queueId: queueIdRef.current,
            playerName: currentName,
            avatar: '👑',
            mode: modeVal,
          }),
        });
        const data = await res.json();
        if (data && data.players) {
          botPlayers = data.players;
          serverFee = data.entryFee;
          serverPrize = data.prizePool;
        }
      } catch (_) {}

      if (!botPlayers || botPlayers.length === 0) {
        botPlayers =
          modeVal === 2
            ? [
                { color: 'red', name: currentName, avatar: '👑', isBot: false },
                { color: 'yellow', name: 'Aarav_Pro', avatar: '⚡', isBot: true, rating: 1420 },
              ]
            : [
                { color: 'red', name: currentName, avatar: '👑', isBot: false },
                { color: 'green', name: 'Sneha_Dice', avatar: '🎲', isBot: true, rating: 1350 },
                { color: 'yellow', name: 'Aarav_Pro', avatar: '⚡', isBot: true, rating: 1420 },
                { color: 'blue', name: 'Vikram_Knight', avatar: '🛡️', isBot: true, rating: 1480 },
              ];
      }

      finalizeAndStartMatch(botPlayers, 'bot_matched', modeVal, {
        serverFee,
        serverPrize,
      });
    },
    [finalizeAndStartMatch, playerName, stopMatchmakingTimers]
  );

  const startMatchmakingRest = useCallback(
    async (modeVal, currentName) => {
      try {
        const stableId = getStablePlayerId(user?.walletAddress);
        const res = await fetch('/api/games/ludo/matchmake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: stableId,
            playerName: currentName,
            avatar: '👑',
            mode: modeVal,
          }),
        });
        const data = await res.json();

        if (data && data.status === 'matched' && Array.isArray(data.players)) {
          // Socket queue theke beriye jao (REST-e match peye gechi)
          try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
          socketMatchedRef.current = true;
          // Nijer color playerId diye khujo — ami red na-ও hote pari!
          const me = data.players.find((p) => p.playerId && p.playerId === stableId);
          finalizeAndStartMatch(data.players, 'live_matched', modeVal, {
            isLive: true,
            yourColor: me?.color || 'red',
            matchId: data.matchId,
            myPlayerId: stableId,
            serverFee: data.entryFee,
            serverPrize: data.prizePool,
          });
          return true;
        }

        if (data && data.queueId) {
          queueIdRef.current = data.queueId;
        }
      } catch (_) {}
      return false;
    },
    [finalizeAndStartMatch, user?.walletAddress]
  );

  const startMatchmaking = useCallback(
    async (modeVal = playerMode) => {
      stopMatchmakingTimers();
      matchedDoneRef.current = false;
      queueIdRef.current = null;
      socketMatchedRef.current = false;
      setOpponentLeft(false);
      setIsLiveMatch(false);
      isLiveMatchRef.current = false;
      setIsMatchmaking(true);
      setSearchSecsLeft(MATCHMAKING_TOTAL_SECS);
      setMatchStatus('searching');
      setDeductionMessage(null);
      const currentName = playerName || 'You';
      setMatchedPlayers([{ color: 'red', name: currentName, avatar: '👑', isHost: true }]);

      // 1) Socket.io live search (friend aksathe search korle instant same match)
      try {
        const sock = getLudoSocket();
        const stableId = getStablePlayerId(user?.walletAddress);
        if (sock) {
          sock.emit('ludo:search', {
            playerId: stableId,
            playerName: currentName,
            avatar: '👑',
            mode: modeVal,
          });
        }
      } catch (_) {}

      // 2) REST fallback parallel (socket na thakleo match hobe)
      startMatchmakingRest(modeVal, currentName);

      // 30-Second Loading Countdown Timer
      let remaining = MATCHMAKING_TOTAL_SECS;
      searchCountdownRef.current = setInterval(() => {
        remaining -= 1;
        setSearchSecsLeft(remaining);
        if (remaining <= 0) {
          clearInterval(searchCountdownRef.current);
          searchCountdownRef.current = null;
          if (!socketMatchedRef.current && !matchedDoneRef.current) fallbackToBot(modeVal);
        }
      }, 1000);

      // Poll server for incoming searchers (REST path)
      pollTimerRef.current = setInterval(async () => {
        if (!queueIdRef.current || socketMatchedRef.current || matchedDoneRef.current) return;
        try {
          const pollRes = await fetch(`/api/games/ludo/matchmake/status/${queueIdRef.current}`);
          const pollData = await pollRes.json();
          if (pollData && pollData.status === 'matched' && Array.isArray(pollData.players)) {
            try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
            socketMatchedRef.current = true;
            const stableId = getStablePlayerId(user?.walletAddress);
            const me = pollData.players.find((p) => p.playerId && p.playerId === stableId);
            stopMatchmakingTimers();
            finalizeAndStartMatch(pollData.players, 'live_matched', modeVal, {
              isLive: true,
              yourColor: me?.color || 'red',
              matchId: pollData.matchId,
              myPlayerId: stableId,
              serverFee: pollData.entryFee,
              serverPrize: pollData.prizePool,
            });
          }
        } catch (_) {}
      }, 1200);
    },
    [fallbackToBot, finalizeAndStartMatch, playerMode, playerName, stopMatchmakingTimers, startMatchmakingRest, user?.walletAddress]
  );

  // ---- Socket listeners: matched + live game actions + opponent left ----
  useEffect(() => {
    let sock = null;
    try {
      sock = getLudoSocket();
    } catch (_) { return; }
    if (!sock) return;

    const onMatched = (data) => {
      if (!data?.matchId || !data?.players) return;
      if (matchedDoneRef.current) return;
      socketMatchedRef.current = true;
      cancelRestQueue();
      stopMatchmakingTimers();
      try { sock.emit('ludo:join-room', { matchId: data.matchId }); } catch (_) {}
      const myC = data.yourColor || 'red';
      const myEntry = data.players.find((p) => p.color === myC);
      finalizeAndStartMatch(data.players, 'live_matched', data.mode || playerModeRef.current, {
        isLive: true,
        fromSocket: true,
        yourColor: myC,
        matchId: data.matchId,
        myPlayerId: myEntry?.playerId || null,
        serverFee: data.entryFee,
        serverPrize: data.prizePool,
      });
    };
    const onWaiting = () => {};
    const onOpponentLeft = () => {
      if (isLiveMatchRef.current) setOpponentLeft(true);
    };
    const onGameAction = (action) => {
      if (!action || action.matchId !== liveMatchIdRef.current) return;
      suppressBroadcastRef.current = true;
      try {
        if (action.type === 'roll') {
          setCurrentTurn(action.color);
          currentTurnRef.current = action.color;
          // Opponent-er dice amader screen-e ghurte thakbe, tarpor thambe (live feel)
          try { if (remoteDiceIntRef.current) clearInterval(remoteDiceIntRef.current); } catch (_) {}
          remoteAnimToken.current++;
          setIsRolling(true);
          let ticks = 0;
          remoteDiceIntRef.current = setInterval(() => {
            ticks++;
            if (ticks >= 8) {
              try { clearInterval(remoteDiceIntRef.current); } catch (_) {}
              remoteDiceIntRef.current = null;
              setRolledNumber(action.value);
              rolledNumberRef.current = action.value;
              setLastDiceByColor((prev) => ({ ...prev, [action.color]: action.value }));
              setIsRolling(false);
              playBeep(540, 0.12, 'square');
              setActionMessage(`${String(action.color).toUpperCase()} rolled ${action.value} (LIVE).`);
            } else {
              setRolledNumber(1 + Math.floor(Math.random() * 6));
            }
          }, 45);
        } else if (action.type === 'move-start') {
          // Opponent guti tulche — hopping animation-e dekhbo
          if (action.pawnId && typeof action.roll === 'number') {
            playRemoteMoveAnimation(action.pawnId, action.roll);
          }
        } else if (action.type === 'move') {
          // Final snapshot: cholonto visual animation cancel kore exact state bosao
          remoteAnimToken.current++;
          try { if (remoteDiceIntRef.current) clearInterval(remoteDiceIntRef.current); } catch (_) {}
          remoteDiceIntRef.current = null;
          setHoppingPawnId(null);
          setJustExitedPawnId(null);
          if (Array.isArray(action.pawns)) {
            setPawns(action.pawns);
            pawnsRef.current = action.pawns;
          }
          if (action.currentTurn) {
            setCurrentTurn(action.currentTurn);
            currentTurnRef.current = action.currentTurn;
          }
          setRolledNumber(action.rolledNumber ?? null);
          rolledNumberRef.current = action.rolledNumber ?? null;
          if (action.lastDiceByColor) setLastDiceByColor(action.lastDiceByColor);
          if (typeof action.score === 'number') setScore(action.score);
          if (action.actionMessage) setActionMessage(action.actionMessage);
          if (action.knockoutToast) {
            setKnockoutToast(action.knockoutToast);
            setTimeout(() => setKnockoutToast(null), 1800);
          }
          if (action.winner) {
            setWinner(action.winner);
            winnerRef.current = action.winner;
            // Ei match-er prize (server/admin value) — kono hardcode noy
            const prizeToAward = matchPrizeRef.current ?? parseFloat(activePrizePoolRef.current || '0');
            const myC = myColorRef.current;
            if (onGameEventRef.current) {
              if (action.winner === myC) {
                onGameEventRef.current({
                  state: 'over', score: action.score ?? 0, won: true,
                  prizeAmount: prizeToAward, firstWinner: action.winner,
                });
              } else {
                onGameEventRef.current({
                  state: 'over', score: currentScoreRefLive.current ?? 0, won: false,
                  prizeAmount: 0, firstWinner: action.winner,
                });
              }
            }
          }
        } else if (action.type === 'turn') {
          remoteAnimToken.current++;
          try { if (remoteDiceIntRef.current) clearInterval(remoteDiceIntRef.current); } catch (_) {}
          remoteDiceIntRef.current = null;
          setCurrentTurn(action.currentTurn);
          currentTurnRef.current = action.currentTurn;
          setRolledNumber(null);
          rolledNumberRef.current = null;
        }
      } finally {
        setTimeout(() => { suppressBroadcastRef.current = false; }, 50);
      }
    };

    sock.on('ludo:matched', onMatched);
    sock.on('ludo:waiting', onWaiting);
    sock.on('ludo:opponent-left', onOpponentLeft);
    sock.on('ludo:game-action', onGameAction);
    const onConnect = () => {
      socketConnectedRef.current = true;
      setSocketConnected(true);
    };
    const onDisconnect = () => {
      socketConnectedRef.current = false;
      setSocketConnected(false);
    };
    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    if (sock.connected) onConnect();
    return () => {
      sock.off('ludo:matched', onMatched);
      sock.off('ludo:waiting', onWaiting);
      sock.off('ludo:opponent-left', onOpponentLeft);
      sock.off('ludo:game-action', onGameAction);
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User selects mode (2 Players or 4 Players) first
  const handleSelectModeAndStart = (mode) => {
    const requiredFee = parseFloat(mode === 2 ? adminPools.p2Entry : adminPools.p4Entry);
    const userBal = parseFloat(user?.usdtBalance !== undefined && user?.usdtBalance !== null && user?.usdtBalance !== '' ? user.usdtBalance : '0');

    if (!isNaN(requiredFee) && userBal < requiredFee) {
      setBalanceError(
        `❌ Insufficient USDT balance! ${mode}P mode requires ${requiredFee.toFixed(2)} USDT, but your balance is ${userBal.toFixed(2)} USDT. Game cannot start.`
      );
      return;
    }
    setBalanceError('');
    deductionDispatchedRef.current = false;

    if (!playerName || !playerName.trim()) {
      setPendingMode(mode);
      setNameInputVal('');
      setIsNamePromptOpen(true);
      return;
    }
    setPlayerMode(mode);
    setSelectedModeConfirmed(true);
    const initial = createInitialPawns(mode);
    setPawns(initial);
    pawnsRef.current = initial;
    startMatchmaking(mode);
  };

  const handleCancelSearch = useCallback(() => {
    stopMatchmakingTimers();
    try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
    matchedDoneRef.current = false;
    if (queueIdRef.current) {
      try {
        fetch('/api/games/ludo/matchmake/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueId: queueIdRef.current }),
        });
      } catch (_) {}
    }
    queueIdRef.current = null;
    socketMatchedRef.current = false;
    setIsLiveMatch(false);
    isLiveMatchRef.current = false;
    setIsMatchmaking(false);
    setSelectedModeConfirmed(false);
    setMatchStatus('searching');
    setDeductionMessage(null);
    deductionDispatchedRef.current = false;
  }, [stopMatchmakingTimers]);

  useEffect(() => {
    return () => {
      stopMatchmakingTimers();
      try { if (remoteDiceIntRef.current) clearInterval(remoteDiceIntRef.current); } catch (_) {}
    };
  }, [stopMatchmakingTimers]);

  const triggerGameStart = useCallback(() => {
    if (!gameStartedNotified) {
      setGameStartedNotified(true);
      if (onGameEvent) onGameEvent({ state: 'start' });
    }
  }, [gameStartedNotified, onGameEvent]);

  const addScore = useCallback(
    (pts) => {
      setScore((prev) => {
        const updated = prev + pts;
        if (onGameEvent) onGameEvent({ state: 'score', score: updated });
        return updated;
      });
    },
    [onGameEvent]
  );

  // ---- Per-player turn timer ----
  const currentTurnRef = useRef(currentTurn);
  const rolledNumberRef = useRef(rolledNumber);
  const isRollingRef = useRef(isRolling);
  const winnerRef = useRef(winner);
  useEffect(() => {
    currentTurnRef.current = currentTurn;
  }, [currentTurn]);
  useEffect(() => {
    rolledNumberRef.current = rolledNumber;
  }, [rolledNumber]);
  useEffect(() => {
    isRollingRef.current = isRolling;
  }, [isRolling]);
  useEffect(() => {
    winnerRef.current = winner;
  }, [winner]);

  const resetTurnTimer = useCallback(() => {
    setTurnTimeLeft(TURN_DURATION);
  }, []);

  useEffect(() => {
    resetTurnTimer();
  }, [currentTurn, winner, resetTurnTimer]);

  const recordDiceForColor = useCallback((color, value) => {
    setLastDiceByColor((prev) => ({ ...prev, [color]: value }));
  }, []);
  const lastDiceByColorRef = useRef({ red: null, blue: null, green: null, yellow: null });
  useEffect(() => { lastDiceByColorRef.current = lastDiceByColor; }, [lastDiceByColor]);

  // Lock while a pawn is hopping or animating
  const animatingRef = useRef(false);
  const animSeqRef = useRef(0);

  // Step-by-step path from pawn to destination
  const getStepPath = (pawn, rollVal) => {
    if (pawn.position === pawn.basePos) {
      return rollVal === 6 ? [START_SQUARES[pawn.color]] : [];
    }
    const path = [];
    let curPos = pawn.position;
    for (let i = 0; i < rollVal; i++) {
      const nxt = getPositionAfterMove({ ...pawn, position: curPos }, 1);
      if (nxt === curPos) break;
      path.push(nxt);
      curPos = nxt;
    }
    return path;
  };

  // Switch player turn in active set
  const advanceTurn = useCallback(
    (currentCol) => {
      const currentIndex = activePlayers.indexOf(currentCol);
      const nextIndex = (currentIndex + 1) % activePlayers.length;
      const nextColor = activePlayers[nextIndex];
      const myC = myColorRef.current || 'red';
      const mine = isLiveMatchRef.current ? nextColor === myC : nextColor === 'red';
      setCurrentTurn(nextColor);
      currentTurnRef.current = nextColor;
      setActionMessage(
        mine ? 'Your turn! Tap the dice.' : `${PLAYER_LABELS[nextColor]}'s turn.`
      );
    },
    [activePlayers]
  );

  // Execute pawn move with fluid hopping and collision capture
  const executeMove = useCallback(
    (pawnToMove, rollVal) => {
      if (animatingRef.current) return;
      animatingRef.current = true;
      const seq = animSeqRef.current;
      const currentPawns = pawnsRef.current;
      const nextPos = getPositionAfterMove(pawnToMove, rollVal);
      if (nextPos === pawnToMove.position) {
        animatingRef.current = false;
        return;
      }

      // LIVE: opponent jate hopping animation live dekhte pay — move-er agei janiye dao.
      // Final board snapshot pore 'move' hisebe jabe; opponent visual + snapshot miliye dekhbe.
      broadcastGameAction({ type: 'move-start', pawnId: pawnToMove.id, roll: rollVal, color: pawnToMove.color });

      const isBaseRelease = pawnToMove.position === pawnToMove.basePos;
      const reachedHome = nextPos === HOME_GOALS[pawnToMove.color];
      const isSafe = SAFE_SQUARES.includes(nextPos) || nextPos >= 68;

      // Identify potential knockout target
      const victimPawn = !isSafe
        ? currentPawns.find(
            (p) => p.isActive && p.position === nextPos && p.color !== pawnToMove.color
          )
        : null;

      const scoredKnockout = Boolean(victimPawn);
      const knockedColor = victimPawn ? victimPawn.color : null;

      // Finish move sequence and apply state
      const finishMove = () => {
        // Step 1: Handle Knockout collision if applicable
        if (scoredKnockout && victimPawn) {
          const gridCoords = GRID_MAP[nextPos];
          if (gridCoords) {
            setKnockoutState({
              r: gridCoords.r,
              c: gridCoords.c,
              attackerColor: pawnToMove.color,
              victimColor: knockedColor,
            });
          }

          // Trigger board shake and dramatic sound
          setIsBoardShaking(true);
          setFlyingVictimId(victimPawn.id);
          setKnockoutToast(
            `💥 KNOCKOUT! ${pawnToMove.color.toUpperCase()} captured ${knockedColor.toUpperCase()}! (+200 PTS & Extra Roll)`
          );
          playBeep(210, 0.3, 'sawtooth');
          setTimeout(() => playBeep(420, 0.2, 'triangle'), 80);

          setTimeout(() => {
            setIsBoardShaking(false);
          }, 450);

          // Victim finishes flying back into base
          setTimeout(() => {
            if (animSeqRef.current !== seq) return;
            setFlyingVictimId(null);
            setKnockoutState(null);
            playBeep(340, 0.1, 'sine');
          }, 520);

          setTimeout(() => {
            setKnockoutToast(null);
          }, 1800);
        }

        // Calculate finalized pawns
        const finalizedPawns = currentPawns.map((p) => {
          if (p.id === pawnToMove.id) {
            return { ...p, position: nextPos, isHome: reachedHome };
          }
          if (victimPawn && p.id === victimPawn.id) {
            return { ...p, position: p.basePos };
          }
          return p;
        });

        // Set state immediately
        setPawns(finalizedPawns);
        pawnsRef.current = finalizedPawns;
        setHoppingPawnId(null);
        setRipplingPos(null);
        setJustExitedPawnId(null);
        animatingRef.current = false; // Unlock immediately so next click works!

        if (pawnToMove.color === (isLiveMatchRef.current ? myColorRef.current : 'red')) {
          let pts = 50;
          if (scoredKnockout) {
            pts += 200;
            setActionMessage(`💥 You captured ${knockedColor}'s pawn! (+200 pts) Extra roll!`);
          }
          if (reachedHome) {
            pts += 350;
            playBeep(700, 0.25);
            setActionMessage('🏆 Your pawn reached Home! (+350 pts)');
          }
          addScore(pts);
        }

        const playerHomeCount = finalizedPawns.filter(
          (p) => p.color === pawnToMove.color && p.position === HOME_GOALS[p.color]
        ).length;

        if (playerHomeCount === 4) {
          setWinner(pawnToMove.color);
          winnerRef.current = pawnToMove.color;
          animatingRef.current = false;
          // Ei match-er prize (server/admin value) — kono hardcode noy
          const prizeToAward = matchPrizeRef.current ?? parseFloat(activePrizePoolRef.current || activePrizePool);
          // LIVE: board snapshot + winner sobaike janiye dao (opponent live dekhbe)
          broadcastGameAction({
            type: 'move',
            pawns: finalizedPawns,
            currentTurn: pawnToMove.color,
            rolledNumber: null,
            lastDiceByColor: { ...lastDiceByColorRef.current },
            winner: pawnToMove.color,
            knockoutToast: scoredKnockout ? `💥 KNOCKOUT! ${pawnToMove.color.toUpperCase()} captured ${knockedColor.toUpperCase()}!` : null,
          });
          const iWon = isLiveMatchRef.current
            ? pawnToMove.color === myColorRef.current
            : pawnToMove.color === 'red';
          if (iWon) {
            addScore(1000);
            if (onGameEvent) {
              onGameEvent({
                state: 'over',
                score: score + 1000,
                won: true,
                prizeAmount: prizeToAward,
                firstWinner: pawnToMove.color,
              });
            }
          } else {
            if (onGameEvent) {
              onGameEvent({
                state: 'over',
                score,
                won: false,
                prizeAmount: 0,
                firstWinner: pawnToMove.color,
              });
            }
          }
          return;
        }

        const getsExtraTurn = rollVal === 6 || scoredKnockout;

        setTimeout(() => {
          if (animSeqRef.current !== seq) return;
          setRolledNumber(null);
          rolledNumberRef.current = null;
          let nextTurn = pawnToMove.color;
          if (getsExtraTurn) {
            resetTurnTimer();
            setActionMessage(
              `${pawnToMove.color.toUpperCase()} rolled 6 or scored knockout! Extra roll!`
            );
          } else {
            advanceTurn(pawnToMove.color);
            const idx = activePlayersRef.current.indexOf(pawnToMove.color);
            nextTurn = activePlayersRef.current[(idx + 1) % activePlayersRef.current.length];
          }
          // LIVE: protita move-er por full board + next turn broadcast (friend live dekhbe)
          broadcastGameAction({
            type: 'move',
            pawns: finalizedPawns,
            currentTurn: nextTurn,
            rolledNumber: null,
            lastDiceByColor: { ...lastDiceByColorRef.current },
            winner: null,
            knockoutToast: scoredKnockout ? `💥 KNOCKOUT! ${pawnToMove.color.toUpperCase()} captured ${knockedColor.toUpperCase()}! (+200 PTS & Extra Roll)` : null,
            actionMessage: getsExtraTurn
              ? `${pawnToMove.color.toUpperCase()} rolled 6 or scored knockout! Extra roll!`
              : `${nextTurn.toUpperCase()}'s turn (LIVE).`,
          });
        }, scoredKnockout ? 520 : 150);
      };

      // Base release leap
      if (isBaseRelease) {
        setJustExitedPawnId(pawnToMove.id);
        playBeep(700, 0.18, 'sine');
        setTimeout(() => {
          if (animSeqRef.current !== seq) return;
          setPawns((prev) =>
            prev.map((p) => (p.id === pawnToMove.id ? { ...p, position: nextPos } : p))
          );
          setRipplingPos(nextPos);
          finishMove();
        }, 260);
        return;
      }

      // Step-by-step hopping along path
      const path = getStepPath(pawnToMove, rollVal);
      if (path.length === 0) {
        animatingRef.current = false;
        return;
      }

      resetTurnTimer();
      setHoppingPawnId(pawnToMove.id);

      path.forEach((pos, i) => {
        setTimeout(() => {
          if (animSeqRef.current !== seq) return;
          setPawns((prev) => {
            const updated = prev.map((p) =>
              p.id === pawnToMove.id ? { ...p, position: pos } : p
            );
            pawnsRef.current = updated;
            return updated;
          });
          setRipplingPos(pos);
          playBeep(520 + i * 35, 0.08, 'triangle');

          // If reached final square of traversal
          if (i === path.length - 1) {
            setTimeout(() => {
              if (animSeqRef.current !== seq) return;
              finishMove();
            }, 80);
          }
        }, (i + 1) * STEP_MS);
      });
    },
    [addScore, advanceTurn, onGameEvent, score, resetTurnTimer, broadcastGameAction, activePrizePool]
  );

  // Remote visual: opponent-er guti amader board-e hopping animation-e dekhabe.
  // Shudhu visual — score/turn/winner/final position 'move' snapshot-e asbe.
  const playRemoteMoveAnimation = useCallback((pawnId, rollVal) => {
    const cur = pawnsRef.current;
    const pawn = cur.find((p) => p.id === pawnId);
    if (!pawn || animatingRef.current) return;
    const seq = ++remoteAnimToken.current;
    const stillLive = () => remoteAnimToken.current === seq;

    // Base theke berono leap
    if (pawn.position === pawn.basePos) {
      if (rollVal !== 6) return;
      setJustExitedPawnId(pawnId);
      playBeep(700, 0.18, 'sine');
      setTimeout(() => {
        if (!stillLive()) return;
        const out = START_SQUARES[pawn.color];
        setPawns((prev) => {
          const updated = prev.map((p) => (p.id === pawnId ? { ...p, position: out } : p));
          pawnsRef.current = updated;
          return updated;
        });
        setRipplingPos(out);
      }, 260);
      return;
    }

    // Ghuti guti hopping
    const path = getStepPath(pawn, rollVal);
    if (path.length === 0) return;
    path.forEach((pos, i) => {
      setTimeout(() => {
        if (!stillLive()) return;
        setPawns((prev) => {
          const updated = prev.map((p) => (p.id === pawnId ? { ...p, position: pos } : p));
          pawnsRef.current = updated;
          return updated;
        });
        setRipplingPos(pos);
        playBeep(520 + i * 35, 0.08, 'triangle');
      }, (i + 1) * STEP_MS);
    });
  }, []);

  // Roll dice handler (human — live match-e nijer color, local-e red)
  const handleRollDice = useCallback(() => {
    const myC = myColorRef.current || 'red';
    const turnNow = currentTurnRef.current;
    // Live match-e sudhu nijer turn-e roll kora jabe (opponent-er ta touch kora jabe na)
    if (isLiveMatchRef.current && turnNow !== myC) return;
    if (
      animatingRef.current ||
      isRollingRef.current ||
      rolledNumberRef.current !== null ||
      (!isLiveMatchRef.current && turnNow !== 'red') ||
      (isLiveMatchRef.current && turnNow !== myC) ||
      winnerRef.current
    )
      return;

    triggerGameStart();
    setIsRolling(true);
    playBeep(320, 0.08, 'sawtooth');

    let count = 0;
    const interval = setInterval(() => {
      setRolledNumber(Math.floor(Math.random() * 6) + 1);
      playBeep(260 + Math.random() * 80, 0.04, 'sawtooth');
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const finalRoll = Math.floor(Math.random() * 6) + 1;
        setRolledNumber(finalRoll);
        rolledNumberRef.current = finalRoll;
        recordDiceForColor(myC, finalRoll);
        setIsRolling(false);
        resetTurnTimer();
        // Crisp dice slam sound
        playBeep(540, 0.12, 'square');

        // LIVE: opponent ke sathe sathe roll ta dekhiye dao
        broadcastGameAction({ type: 'roll', color: myC, value: finalRoll });

        const currentPawns = pawnsRef.current;
        const myPawns = currentPawns.filter((p) => p.color === myC && p.isActive);
        const legalMoves = myPawns.filter((p) => canPawnMove(p, finalRoll));

        if (legalMoves.length === 0) {
          setActionMessage(`Rolled ${finalRoll}. No legal moves! Turn passes.`);
          setTimeout(() => {
            setRolledNumber(null);
            rolledNumberRef.current = null;
            advanceTurn(myC);
            // LIVE: turn pass tao opponent ke janiye dao
            if (isLiveMatchRef.current) {
              const idx = activePlayersRef.current.indexOf(myC);
              const next = activePlayersRef.current[(idx + 1) % activePlayersRef.current.length];
              broadcastGameAction({ type: 'turn', currentTurn: next });
            }
          }, 900);
        } else if (legalMoves.length === 1) {
          setActionMessage(`Rolled ${finalRoll}! Tap your coin to move.`);
        } else {
          setActionMessage(`Rolled ${finalRoll}! Tap any glowing coin to move it.`);
        }
      }
    }, 45);
  }, [advanceTurn, recordDiceForColor, triggerGameStart, resetTurnTimer, broadcastGameAction]);

  // Bot Turn Logic (Computer: Yellow in 2-Player; Green, Yellow, Blue in 4-Player)
  // LIVE + socket connected thakle bot chole na — opponent-er chal socket diye asbe.
  // Socket offline thakle bot opponent-er chal chaliye debe (graceful degradation).
  useEffect(() => {
    const live = isLiveMatchRef.current;
    const connected = socketConnectedRef.current;
    if (live && connected) return;
    const myC = live ? (myColorRef.current || 'red') : 'red';
    if (winner || currentTurn === myC || isRolling || rolledNumber !== null) return;
    if (!activePlayers.includes(currentTurn)) return;
    if (botTurnActiveRef.current) return;
    botTurnActiveRef.current = true;

    const botColor = currentTurn;
    setActionMessage(`${PLAYER_LABELS[botColor]} is rolling...`);

    const thinkTimer = setTimeout(() => {
      setIsRolling(true);
      playBeep(280, 0.08, 'sawtooth');

      let ticks = 0;
      const rollInterval = setInterval(() => {
        ticks++;
        setRolledNumber(Math.floor(Math.random() * 6) + 1);
        playBeep(240 + Math.random() * 60, 0.04, 'sawtooth');

        if (ticks >= 14) {
          clearInterval(rollInterval);
          const finalRoll = Math.floor(Math.random() * 6) + 1;
          setRolledNumber(finalRoll);
          recordDiceForColor(botColor, finalRoll);
          setIsRolling(false);
          resetTurnTimer();
          playBeep(480, 0.1, 'square');

          const currentPawns = pawnsRef.current;
          const botPawns = currentPawns.filter((p) => p.color === botColor && p.isActive);
          const legalMoves = botPawns.filter((p) => canPawnMove(p, finalRoll));

          if (legalMoves.length === 0) {
            setActionMessage(
              `${botColor.toUpperCase()} rolled ${finalRoll} (no moves). Turn passes.`
            );
            setTimeout(() => {
              botTurnActiveRef.current = false;
              setRolledNumber(null);
              advanceTurn(botColor);
            }, 900);
          } else {
            let chosenPawn = legalMoves[0];
            // Prioritize capturing opponent pawns
            for (const p of legalMoves) {
              const targetPos = getPositionAfterMove(p, finalRoll);
              const canKnock = currentPawns.some(
                (other) =>
                  other.isActive &&
                  other.color !== botColor &&
                  other.position === targetPos &&
                  !SAFE_SQUARES.includes(targetPos) &&
                  targetPos < 68
              );
              if (canKnock) {
                chosenPawn = p;
                break;
              }
              if (p.position === p.basePos) chosenPawn = p;
            }
            setActionMessage(`${botColor.toUpperCase()} rolled ${finalRoll}. Moving pawn...`);
            setTimeout(() => {
              botTurnActiveRef.current = false;
              executeMove(chosenPawn, finalRoll);
            }, 680);
          }
        }
      }, 60);
    }, 600);

    return () => {
      clearTimeout(thinkTimer);
    };
  }, [
    currentTurn,
    activePlayers,
    isRolling,
    rolledNumber,
    winner,
    executeMove,
    recordDiceForColor,
    resetTurnTimer,
    advanceTurn,
    socketConnected,
    isLiveMatch,
  ]);

  // Turn countdown ticker
  useEffect(() => {
    if (winner) return;
    const ticker = setInterval(() => {
      setTurnTimeLeft((prev) => (prev <= 0.1 ? 0 : Math.max(0, prev - 0.1)));
    }, 100);
    return () => clearInterval(ticker);
  }, [winner]);

  // Timeout handler - No autoplay for human, turn passes if time expires
  useEffect(() => {
    if (winner || turnTimeLeft > 0) return;
    const turn = currentTurnRef.current;
    const rolling = isRollingRef.current;
    if (rolling || animatingRef.current) {
      resetTurnTimer();
      return;
    }
    // LIVE + connected: sudhu nijer turn timeout hole pass + broadcast; opponent-er timer local-e skip korbo na.
    // Offline hole bot-style handling (neeche).
    if (isLiveMatchRef.current && socketConnectedRef.current) {
      const myC = myColorRef.current;
      if (turn !== myC) return;
      setActionMessage("⏱ Time's up! You missed your turn.");
      setRolledNumber(null);
      rolledNumberRef.current = null;
      advanceTurn(turn);
      const idx = activePlayersRef.current.indexOf(turn);
      const next = activePlayersRef.current[(idx + 1) % activePlayersRef.current.length];
      broadcastGameAction({ type: 'turn', currentTurn: next });
      return;
    }
    if (turn === 'red') {
      setActionMessage("⏱ Time's up! You missed your turn.");
      setRolledNumber(null);
      advanceTurn('red');
    } else {
      if (botTurnActiveRef.current) return;
      setActionMessage(`⏱ ${turn.toUpperCase()} ran out of time! Turn skipped.`);
      setRolledNumber(null);
      advanceTurn(turn);
    }
  }, [turnTimeLeft, winner, resetTurnTimer, advanceTurn, broadcastGameAction]);

  // Mode Switch Handler (2 Players vs 4 Players)
  const handleModeChange = (newMode) => {
    if (animatingRef.current || isRolling) return;
    try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
    matchedDoneRef.current = false;
    setIsLiveMatch(false);
    isLiveMatchRef.current = false;
    setLiveMatchId(null);
    liveMatchIdRef.current = null;
    socketMatchedRef.current = false;
    stopMatchmakingTimers();
    setPlayerMode(newMode);
    setSelectedModeConfirmed(false);
    setIsMatchmaking(false);
    setMatchStatus('searching');
    setDeductionMessage(null);
    botTurnActiveRef.current = false;
    animSeqRef.current += 1;
    animatingRef.current = false;
    const initial = createInitialPawns(newMode);
    setPawns(initial);
    pawnsRef.current = initial;
    setCurrentTurn('red');
    setRolledNumber(null);
    setIsRolling(false);
    setWinner(null);
    setScore(0);
    setGameStartedNotified(false);
    setLastDiceByColor({ red: null, blue: null, green: null, yellow: null });
    setKnockoutToast(null);
    setKnockoutState(null);
    setFlyingVictimId(null);
    setHoppingPawnId(null);
    resetTurnTimer();
    if (onGameEvent) onGameEvent({ state: 'reload' });
  };

  const handleRestartGame = () => {
    stopMatchmakingTimers();
    try { getLudoSocket()?.emit('ludo:cancel'); } catch (_) {}
    matchedDoneRef.current = false;
    setIsLiveMatch(false);
    isLiveMatchRef.current = false;
    setLiveMatchId(null);
    liveMatchIdRef.current = null;
    socketMatchedRef.current = false;
    setMyColor('red');
    myColorRef.current = 'red';
    setOpponentLeft(false);
    botTurnActiveRef.current = false;
    animSeqRef.current += 1;
    animatingRef.current = false;
    const initial = createInitialPawns(playerMode);
    setPawns(initial);
    pawnsRef.current = initial;
    setCurrentTurn('red');
    setRolledNumber(null);
    setIsRolling(false);
    setWinner(null);
    setScore(0);
    setGameStartedNotified(false);
    setLastDiceByColor({ red: null, blue: null, green: null, yellow: null });
    setKnockoutToast(null);
    setKnockoutState(null);
    setFlyingVictimId(null);
    setHoppingPawnId(null);
    resetTurnTimer();
    setSelectedModeConfirmed(false);
    setIsMatchmaking(false);
    setMatchStatus('searching');
    setDeductionMessage(null);
    if (onGameEvent) onGameEvent({ state: 'reload' });
  };

  const getPlayerProfile = useCallback(
    (color) => {
      const matched = matchedPlayers.find((p) => p.color === color);
      if (matched) {
        // Live match-e nijer color-e nijer naam; opponent-er naam server theke asa ta
        if (isLiveMatchRef.current && color === myColorRef.current && playerName) {
          return { ...matched, name: playerName };
        }
        if (!isLiveMatchRef.current && color === 'red' && playerName) {
          return { ...matched, name: playerName };
        }
        return matched;
      }
      const myC = myColorRef.current;
      const isMine = isLiveMatchRef.current ? color === myC : color === 'red';
      return {
        name: isMine ? (playerName || 'You') : PLAYER_LABELS[color],
        avatar: PLAYER_ICONS[color],
        isBot: isLiveMatchRef.current ? false : color !== 'red',
      };
    },
    [matchedPlayers, playerName, isLiveMatch, myColor]
  );

  // Group track pawns by logical position
  const pawnsByPos = useMemo(() => {
    const map = {};
    pawns.forEach((p) => {
      if (!p.isActive) return;
      if (p.position === p.basePos) return;
      if (!GRID_MAP[p.position]) return;
      if (!map[p.position]) map[p.position] = [];
      map[p.position].push(p);
    });
    return map;
  }, [pawns]);

  const pawnInBase = useCallback(
    (color, slotIdx) =>
      pawns.find(
        (p) =>
          p.isActive &&
          p.color === color &&
          p.position === p.basePos &&
          p.basePos - BASE_OFFSETS[color] === slotIdx
      ),
    [pawns]
  );

  const handlePawnClick = useCallback(
    (pawn) => {
      if (animatingRef.current || isRollingRef.current || winnerRef.current) return;
      const myC = myColorRef.current || 'red';
      const turnNow = currentTurnRef.current;
      // Live match-e sudhu nijer color-er guti + nijer turn-e move
      if (isLiveMatchRef.current) {
        if (turnNow !== myC) return;
        if (pawn.color !== myC) return;
      } else {
        if (turnNow !== 'red') return;
        if (pawn.color !== 'red') return;
      }

      const roll = rolledNumberRef.current;
      if (roll === null) {
        setActionMessage('Roll the dice first!');
        playBeep(220, 0.08, 'square');
        return;
      }

      if (!canPawnMove(pawn, roll)) {
        if (pawn.position === pawn.basePos) {
          setActionMessage(`That coin needs a 6 to come out (you rolled ${roll}).`);
        } else {
          setActionMessage(`That coin cannot move ${roll} squares from here.`);
        }
        playBeep(200, 0.12, 'square');
        return;
      }

      // Legal move -> execute immediately on very first click!
      playBeep(640, 0.08, 'sine');
      executeMove(pawn, roll);
    },
    [executeMove]
  );

  const timerProgress = Math.max(0, Math.min(1, turnTimeLeft / TURN_DURATION));
  const timerColor =
    turnTimeLeft <= 5
      ? '#ef4444'
      : turnTimeLeft <= 10
      ? '#f59e0b'
      : COLOR_HEX[currentTurn] || '#22c55e';

  // Ring-token coin with glossy highlight
  const PawnIcon = ({ color }) => {
    const core = COLOR_HEX[color] || '#999';
    return (
      <svg viewBox="0 0 48 48" className={styles.pawnIconSvg} aria-hidden="true">
        <ellipse cx="24" cy="28" rx="16" ry="13" fill="rgba(0,0,0,0.35)" />
        <circle cx="24" cy="24" r="17" fill="#ffffff" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="24" cy="24" r="11" fill={core} stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
        <circle cx="24" cy="24" r="11" fill="url(#pawnShade)" opacity="0.35" />
        <ellipse cx="19.5" cy="18.5" rx="4.2" ry="3" fill="#ffffff" opacity="0.95" />
        <defs>
          <radialGradient id="pawnShade" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>
      </svg>
    );
  };

  const renderPawnToken = (pawn, stacked) => {
    const myC = isLiveMatch ? myColor : 'red';
    const isMovable =
      !isRolling &&
      currentTurn === pawn.color &&
      (isLiveMatch ? pawn.color === myC : true) &&
      rolledNumber !== null &&
      canPawnMove(pawn, rolledNumber) &&
      !winner;
    const isHopping = hoppingPawnId === pawn.id;
    const isFlying = flyingVictimId === pawn.id;
    const isExiting = justExitedPawnId === pawn.id;

    return (
      <button
        key={pawn.id}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handlePawnClick(pawn);
        }}
        className={`${styles.classicPawn} ${isMovable ? styles.classicPawnMovable : ''} ${
          stacked ? styles.classicPawnStacked : ''
        } ${isHopping ? styles.pawnHopping : ''} ${isFlying ? styles.pawnFlyingBack : ''} ${
          isExiting ? styles.pawnExitBase : ''
        }`}
        title={`${pawn.color} pawn${isMovable ? ' - Click to move' : ''}`}
      >
        <PawnIcon color={pawn.color} />
      </button>
    );
  };

  const renderCell = (r, c) => {
    const key = `${r}-${c}`;
    const placement = { gridRow: r + 1, gridColumn: c + 1 };
    if (isCenterCell(r, c)) return null;

    const baseColor = baseColorForCell(r, c);
    if (baseColor) return null;

    const pos = CELL_TO_POS[`${r},${c}`];
    if (pos === undefined) {
      return <div key={key} className={styles.classicVoid} style={placement} />;
    }

    const startColor = startColorForPos(pos);
    const homeColor = homeColorForPos(pos);
    const arrow = ARROW_CELLS[`${r},${c}`];
    const cellPawns = pawnsByPos[pos] || [];
    const bg = startColor
      ? BOARD_COLORS[startColor]
      : homeColor
      ? BOARD_COLORS[homeColor]
      : '#ffffff';
    const isRippling = ripplingPos === pos;
    const isKnockoutCell = knockoutState && knockoutState.r === r && knockoutState.c === c;

    return (
      <div
        key={key}
        className={`${styles.classicCell} ${isRippling ? styles.cellRipple : ''}`}
        style={{
          background: bg,
          ...placement,
        }}
        onClick={() => {
          const myC = isLiveMatch ? myColor : 'red';
          if (isRolling || currentTurn !== myC || winner) return;
          const roll = rolledNumber;
          if (roll === null) return;
          const movable = cellPawns.filter(
            (p) => p.color === myC && canPawnMove(p, roll)
          );
          if (movable.length > 0) {
            handlePawnClick(movable[0]);
          }
        }}
      >
        {/* Knockout impact blast overlay */}
        {isKnockoutCell && (
          <div className={styles.knockoutBlastOverlay}>
            <div className={styles.knockoutBlastRing} />
            <span className={styles.knockoutFlash}>💥</span>
          </div>
        )}

        {/* Golden Star for Safe / Start Squares */}
        {startColor ? (
          <span className={styles.classicStar} title="Safe Square">
            ★
          </span>
        ) : null}

        {arrow ? <span className={styles.classicArrow}>{arrow}</span> : null}

        {cellPawns.length > 0 && (
          <div className={styles.classicPawnStack}>
            {cellPawns.slice(0, 4).map((p) => renderPawnToken(p, cellPawns.length > 1))}
          </div>
        )}
      </div>
    );
  };

  const cells = [];
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      cells.push(renderCell(r, c));
    }
  }

  // Render gamer panel for side rails
  const renderPlayerPanel = (color) => {
    const myC = isLiveMatch ? myColor : 'red';
    const isYou = color === myC;
    const profile = getPlayerProfile(color);
    const isPanelActiveInMode = activePlayers.includes(color);
    const isActiveTurn = currentTurn === color && !winner;
    const diceVal = lastDiceByColor[color];
    const secs = isActiveTurn ? Math.ceil(turnTimeLeft) : TURN_DURATION;
    const canRoll = isYou && isActiveTurn && !isRolling && rolledNumber === null;

    const diceFace =
      isActiveTurn && isRolling ? (
        <img
          src={DICE_IMAGES[(rolledNumber || 1) - 1]}
          alt="Rolling dice"
          className={`${styles.sideDiceImg} ${styles.dice3DTumble}`}
        />
      ) : (
        <img
          key={diceVal ? `land-${color}-${diceVal}` : `idle-${color}`}
          src={diceVal ? DICE_IMAGES[diceVal - 1] : diceRollIcon}
          alt={`${color} dice`}
          className={`${styles.sideDiceImg} ${diceVal ? styles.diceLand : ''}`}
        />
      );

    return (
      <div
        key={color}
        className={`${styles.sidePanel} ${isActiveTurn ? styles.sidePanelActive : ''} ${
          !isPanelActiveInMode ? styles.sidePanelDimmed : ''
        }`}
        style={{ '--panel-color': BOARD_COLORS[color] }}
      >
        <div className={styles.sideAvatar} style={{ borderColor: BOARD_COLORS[color] }}>
          <span className={styles.sideAvatarIcon}>{profile.avatar || PLAYER_ICONS[color]}</span>
          {isActiveTurn && <span className={styles.sideActiveCrown}>👑</span>}
        </div>
        <div className={styles.sideName}>{profile.name}</div>
        {isPanelActiveInMode && (
          <span
            className={`${styles.playerTypeBadge} ${
              profile.isBot ? styles.playerTypeBot : styles.playerTypeLive
            }`}
          >
            {isYou ? 'YOU' : profile.isBot ? 'BOT' : 'ONLINE'}
          </span>
        )}

        {isYou ? (
          <button
            type="button"
            onClick={handleRollDice}
            disabled={!canRoll}
            className={`${styles.sideDiceBox} ${styles.sideDiceBtn} ${
              canRoll ? styles.sideDiceClickable : ''
            }`}
            title={canRoll ? 'Tap the dice to roll' : 'Your dice'}
          >
            {diceFace}
            {canRoll && <span className={styles.tapDiceHint}>TAP TO ROLL</span>}
          </button>
        ) : (
          <div className={styles.sideDiceBox}>{diceFace}</div>
        )}

        {isPanelActiveInMode ? (
          <>
            <div
              className={`${styles.sideTimer} ${
                isActiveTurn && turnTimeLeft <= 5 ? styles.sideTimerUrgent : ''
              }`}
            >
              ⏱ {secs}s
            </div>
            {isActiveTurn && (
              <div className={styles.sideTimerBar}>
                <span style={{ width: `${timerProgress * 100}%`, background: timerColor }} />
              </div>
            )}
            <div className={styles.sideHomeCount}>
              🏠{' '}
              {
                pawns.filter(
                  (p) => p.isActive && p.color === color && p.position === HOME_GOALS[color]
                ).length
              }
              /4
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700 }}>
            Inactive (1v1)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.ludoArenaContainer}>
      {/* 0. First-Time Player Name Modal */}
      {isNamePromptOpen && (
        <div className={styles.nameModalBackdrop}>
          <div className={styles.nameModalCard}>
            <div className={styles.nameModalHeader}>
              <div className={styles.nameModalBadge}>👑 LUDO PROFILE</div>
              <h3 className={styles.nameModalTitle}>
                {playerName ? 'Edit Player Name' : 'Enter Your Player Name'}
              </h3>
              <p className={styles.nameModalSubtitle}>
                Save your name for tournaments, matchmaking radar, and the winner banner!
              </p>
            </div>
            <form onSubmit={handleSavePlayerName} className={styles.nameModalForm}>
              <input
                type="text"
                value={nameInputVal}
                onChange={(e) => {
                  setNameInputVal(e.target.value);
                  if (nameError) setNameError('');
                }}
                placeholder="Enter player name (e.g. ProGamer)"
                maxLength={18}
                autoFocus
                className={styles.nameModalInput}
              />
              {nameError && <div className={styles.nameModalError}>{nameError}</div>}
              <div className={styles.nameModalActions}>
                {playerName && (
                  <button
                    type="button"
                    className={styles.nameModalCancelBtn}
                    onClick={() => setIsNamePromptOpen(false)}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className={styles.nameModalSubmitBtn}>
                  Save & Continue 🎲
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Mode Selection Screen (User chooses 2 or 4 players before loading) */}
      {!selectedModeConfirmed && (
        <div className={styles.modeSelectOverlay}>
          <div className={styles.modeSelectCard}>
            <div className={styles.modeSelectHeader}>
              <h2 className={styles.modeSelectTitle}>
                <span>🎲</span> SELECT LUDO TOURNAMENT MODE
              </h2>
              <p className={styles.modeSelectSubtitle}>
                Select your match arena. After selection, 30-second matchmaking loading begins and entry fee is deducted right before the match starts!
              </p>

              {/* Player Name Tag with quick edit */}
              <div className={styles.playerNamePill}>
                <span className={styles.playerNamePillLabel}>Player Profile:</span>
                <span className={styles.playerNamePillVal}>👑 {playerName || 'Guest Player'}</span>
                <button
                  type="button"
                  className={styles.changeNameBtn}
                  onClick={() => {
                    setNameInputVal(playerName || '');
                    setIsNamePromptOpen(true);
                  }}
                >
                  ✏️ Edit Name
                </button>
              </div>
            </div>

            {balanceError && (
              <div style={{
                background: 'rgba(255, 82, 82, 0.15)',
                border: '1px solid #FF5252',
                color: '#FF5252',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>{balanceError}</span>
                <div style={{ color: '#FFB300', fontWeight: 600, fontSize: '0.88rem', marginTop: '4px' }}>
                  ⚠️ Add token in your wallet
                </div>
              </div>
            )}

            <div className={styles.modeSelectGrid}>
              {/* Option 1: 2 Players (1 vs 1) */}
              <div
                className={`${styles.modeCardOption} ${playerMode === 2 ? styles.modeCardOptionActive : ''}`}
                onClick={() => handleSelectModeAndStart(2)}
              >
                <span className={`${styles.modeBadgePill} ${styles.badge2P}`}>1 ON 1 DUEL</span>
                <div className={styles.modeIconDisplay}>👥</div>
                <h3 className={styles.modeOptionName}>2 Players (1v1)</h3>
                <div className={styles.modePoolsRow}>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Entry Fee:</span>
                    <span className={styles.modePoolValue} style={{ color: '#38bdf8' }}>
                      {adminPools.p2Entry} USDT
                    </span>
                  </div>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Prize Pool:</span>
                    <span className={styles.modePoolValue} style={{ color: '#00E676' }}>
                      {adminPools.p2Prize} USDT
                    </span>
                  </div>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Rule:</span>
                    <span className={styles.modePoolValue} style={{ color: '#FFB300' }}>
                      1st Winner Takes All 🏆
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.modeSelectActionBtn} ${styles.btn2P}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectModeAndStart(2);
                  }}
                >
                  Join 2-Player Match (-{adminPools.p2Entry} USDT)
                </button>
              </div>

              {/* Option 2: 4 Players (Classic Tournament) */}
              <div
                className={`${styles.modeCardOption} ${playerMode === 4 ? styles.modeCardOptionActive : ''}`}
                onClick={() => handleSelectModeAndStart(4)}
              >
                <span className={`${styles.modeBadgePill} ${styles.badge4P}`}>4-PLAYER TOURNAMENT</span>
                <div className={styles.modeIconDisplay}>👑</div>
                <h3 className={styles.modeOptionName}>4 Players (Classic)</h3>
                <div className={styles.modePoolsRow}>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Entry Fee:</span>
                    <span className={styles.modePoolValue} style={{ color: '#fbbf24' }}>
                      {adminPools.p4Entry} USDT
                    </span>
                  </div>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Prize Pool:</span>
                    <span className={styles.modePoolValue} style={{ color: '#00E676' }}>
                      {adminPools.p4Prize} USDT
                    </span>
                  </div>
                  <div className={styles.modePoolItem}>
                    <span className={styles.modePoolLabel}>Rule:</span>
                    <span className={styles.modePoolValue} style={{ color: '#FFB300' }}>
                      1st Winner Takes All 🏆
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.modeSelectActionBtn} ${styles.btn4P}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectModeAndStart(4);
                  }}
                >
                  Join 4-Player Match (-{adminPools.p4Entry} USDT)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Online Matchmaking 30-Second Radar Overlay */}
      {isMatchmaking && (
        <div className={styles.matchmakingOverlay}>
          <div className={styles.matchmakingCard}>
            <div className={styles.radarContainer}>
              <div className={styles.radarSweep} />
              <div className={styles.radarRingInner} />
              <span className={styles.radarCenterIcon}>🎲</span>
            </div>

            <h3 className={styles.matchmakingTitle}>
              {deductionMessage
                ? '💳 DEDUCTING ENTRY FEE & STARTING...'
                : matchStatus === 'live_matched'
                ? '🎯 LIVE OPPONENTS FOUND!'
                : matchStatus === 'bot_matched'
                ? '⚡ AI CHALLENGERS READY!'
                : `🔍 MATCHMAKING (${playerMode} PLAYERS)...`}
            </h3>

            <p className={styles.matchmakingSubtitle}>
              {deductionMessage ? (
                <span style={{ color: '#39FF88', fontWeight: 700 }}>{deductionMessage}</span>
              ) : matchStatus === 'searching' ? (
                <>
                  {socketConnected ? (
                    <>Searching for live opponents... (</>
                  ) : (
                    <>🔴 Server live offline — purono server cholche, <strong>server restart</strong> dao (node server.js)! Nahole 30s por bot-e khelte hobe. (</>
                  )}
                  <span className={styles.matchmakingCountdown}>{searchSecsLeft}s</span> left)
                </>
              ) : (
                'Finalizing match and deducting entry pool...'
              )}
            </p>

            {/* 30-Second Matchmaking Progress Bar */}
            <div className={styles.matchProgressBarContainer}>
              <div
                className={styles.matchProgressBarFill}
                style={{
                  width: `${Math.min(100, Math.max(4, ((30 - searchSecsLeft) / 30) * 100))}%`,
                }}
              />
            </div>

            {deductionMessage && (
              <div className={styles.deductionNoticeCard}>
                <span>{deductionMessage}</span>
              </div>
            )}

            <div className={styles.matchmakingSlotsGrid}>
              {/* Slot 1: You */}
              <div className={`${styles.matchSlot} ${styles.matchSlotReady}`}>
                <div className={styles.matchSlotAvatar} style={{ borderColor: BOARD_COLORS.red }}>
                  👑
                </div>
                <div className={styles.matchSlotName}>{playerName || 'You'} (Red)</div>
                <span className={`${styles.matchSlotTag} ${styles.tagLive}`}>READY</span>
              </div>

              {/* Opponent Slots */}
              {(playerMode === 2 ? ['yellow'] : ['green', 'yellow', 'blue']).map((col) => {
                const matched = matchedPlayers.find((p) => p.color === col);
                const isFound = Boolean(matched);
                return (
                  <div
                    key={col}
                    className={`${styles.matchSlot} ${
                      isFound ? styles.matchSlotFound : styles.matchSlotSearching
                    }`}
                  >
                    <div
                      className={styles.matchSlotAvatar}
                      style={{ borderColor: BOARD_COLORS[col] }}
                    >
                      {isFound ? matched.avatar || '⚡' : '⏳'}
                    </div>
                    <div className={styles.matchSlotName}>
                      {isFound ? matched.name : `Searching...`}
                    </div>
                    <span
                      className={`${styles.matchSlotTag} ${
                        !isFound
                          ? styles.tagSearching
                          : matched.isBot
                          ? styles.tagBot
                          : styles.tagLive
                      }`}
                    >
                      {!isFound ? 'SEARCHING' : matched.isBot ? 'CPU' : 'ONLINE'}
                    </span>
                  </div>
                );
              })}
            </div>

            {matchStatus === 'searching' && !deductionMessage && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className={styles.matchCancelBtn}
                  onClick={handleCancelSearch}
                  title="Cancel search and select a different mode"
                >
                  ✕ Cancel Search
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Knockout Toast */}
      {knockoutToast && <div className={styles.knockoutToast}>{knockoutToast}</div>}

      {/* Header bar with Mode switcher, turn indicator, and score pill */}
      <div className={styles.ludoHeaderBar}>
        <div className={styles.turnBadge}>
          <div
            className={styles.turnIndicatorDot}
            style={{
              backgroundColor: COLOR_HEX[currentTurn],
              color: COLOR_HEX[currentTurn],
            }}
          />
          <span>
            Turn: <strong style={{ color: COLOR_HEX[currentTurn] }}>{currentTurn.toUpperCase()}</strong>
          </span>
          {isLiveMatch && (
            <span
              style={{ color: socketConnected ? '#39FF88' : '#FFB300', fontWeight: 800 }}
              title={socketConnected ? `Live Match ${liveMatchId || ''} • You are ${myColor.toUpperCase()} • opponent moves live` : 'Server socket offline — opponent bot khelche. Server restart kore (node server.js) live pabe.'}
            >
              {socketConnected ? `🟢 LIVE ${myColor.toUpperCase()}` : `🟠 OFFLINE ${myColor.toUpperCase()}`}
            </span>
          )}
          {isLiveMatch && opponentLeft && (
            <span style={{ color: '#FFB300', fontWeight: 700 }}>Opponent left</span>
          )}
          {!winner && (
            <span style={{ color: timerColor, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
              ⏱ {Math.ceil(turnTimeLeft)}s
            </span>
          )}
        </div>

        {/* 2-Player vs 4-Player Mode Toggle */}
        <div className={styles.modeSwitcher}>
          <button
            type="button"
            className={`${styles.modeBtn} ${playerMode === 2 ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange(2)}
            title={`Switch to 2 Players (1v1) — Entry ${adminPools.p2Entry} USDT, Prize ${adminPools.p2Prize} USDT`}
          >
            👥 2P ({adminPools.p2Entry} USDT)
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${playerMode === 4 ? styles.modeBtnActive : ''}`}
            onClick={() => handleModeChange(4)}
            title={`Switch to 4 Players Classic Tournament — Entry ${adminPools.p4Entry} USDT, Prize ${adminPools.p4Prize} USDT`}
          >
            👑 4P ({adminPools.p4Entry} USDT)
          </button>
        </div>

        <div className={styles.scorePill}>
          <span>Score:</span>
          <span>{score} PTS</span>
        </div>

        {/* Both modes' pools visible (admin values) */}
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
          <span title="2-Player entry fee & prize pool">
            👥 2P Entry: <strong style={{ color: '#39FF88' }}>{adminPools.p2Entry} USDT</strong>
            {' '}| Prize: <strong style={{ color: '#00E676' }}>{adminPools.p2Prize} USDT</strong>
          </span>
          <span style={{ margin: '0 6px', color: '#475569' }}>•</span>
          <span title="4-Player entry fee & prize pool">
            👑 4P Entry: <strong style={{ color: '#39FF88' }}>{adminPools.p4Entry} USDT</strong>
            {' '}| Prize: <strong style={{ color: '#00E676' }}>{adminPools.p4Prize} USDT</strong>
          </span>{' '}
          <span style={{ color: '#FFB300', fontSize: '0.72rem' }}>(1st Winner)</span>
        </div>
      </div>

      <div className={styles.classicLayout}>
        {/* Left rail: Computer 3 (yellow) top, Computer 2 (green) bottom */}
        <div className={styles.sideRail}>
          {renderPlayerPanel('yellow')}
          {renderPlayerPanel('green')}
        </div>

        {/* Classic 15x15 board with luxury arcade frame */}
        <div
          className={`${styles.classicBoardFrame} ${isBoardShaking ? styles.boardShake : ''}`}
        >
          <div className={styles.classicBoard}>
            {cells}

            {/* Solid home base quadrants */}
            <div
              className={`${styles.baseSolid} ${styles.baseSolidYellow}`}
              style={{ gridRow: '1 / 7', gridColumn: '1 / 7' }}
            />
            <div
              className={`${styles.baseSolid} ${styles.baseSolidBlue} ${
                playerMode === 2 ? styles.baseInactive : ''
              }`}
              style={{ gridRow: '1 / 7', gridColumn: '10 / 16' }}
            >
              {playerMode === 2 && (
                <div className={styles.baseInactiveBadge}>
                  <span>2-Player Mode</span>
                </div>
              )}
            </div>
            <div
              className={`${styles.baseSolid} ${styles.baseSolidGreen} ${
                playerMode === 2 ? styles.baseInactive : ''
              }`}
              style={{ gridRow: '10 / 16', gridColumn: '1 / 7' }}
            >
              {playerMode === 2 && (
                <div className={styles.baseInactiveBadge}>
                  <span>2-Player Mode</span>
                </div>
              )}
            </div>
            <div
              className={`${styles.baseSolid} ${styles.baseSolidRed}`}
              style={{ gridRow: '10 / 16', gridColumn: '10 / 16' }}
            />

            {/* 3D Recessed White Home Boxes with 4 Coin-Wells */}
            {['yellow', 'blue', 'green', 'red'].map((baseColor) => {
              const isBaseActive = activePlayers.includes(baseColor);
              return (
                <div
                  key={`homebox-${baseColor}`}
                  className={`${styles.baseWhiteBox} ${!isBaseActive ? styles.baseInactive : ''}`}
                  style={BASE_BOX_PLACEMENT[baseColor]}
                >
                  {[0, 1, 2, 3].map((slotIdx) => {
                    const pawn = isBaseActive ? pawnInBase(baseColor, slotIdx) : null;
                    const isMovableBase =
                      pawn &&
                      !isRolling &&
                      currentTurn === (isLiveMatch ? myColor : 'red') &&
                      pawn.color === (isLiveMatch ? myColor : 'red') &&
                      rolledNumber !== null &&
                      canPawnMove(pawn, rolledNumber);
                    return (
                      <div
                        key={slotIdx}
                        className={`${styles.baseCircleSlot} ${
                          isMovableBase ? styles.baseSlotMovable : ''
                        }`}
                        onClick={() => {
                          if (pawn) handlePawnClick(pawn);
                        }}
                      >
                        {pawn ? (
                          renderPawnToken(pawn, false)
                        ) : (
                          <span
                            className={styles.baseCircleColor}
                            style={{
                              background: BOARD_COLORS[baseColor],
                              opacity: isBaseActive ? 0.8 : 0.25,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* Center home triangles with victory medallion */}
            <div
              className={styles.classicCenter}
              style={{ gridRow: '7 / 10', gridColumn: '7 / 10' }}
            >
              <div className={`${styles.classicTri} ${styles.triTop}`} />
              <div className={`${styles.classicTri} ${styles.triRight}`} />
              <div className={`${styles.classicTri} ${styles.triBottom}`} />
              <div className={`${styles.classicTri} ${styles.triLeft}`} />

              {/* Center Medallion */}
              <div className={styles.centerMedallion} title="Home Goal">
                <span>🏆</span>
              </div>

              {/* Finished pawns resting in triangles */}
              {['blue', 'red', 'green', 'yellow'].map((color) => {
                if (!activePlayers.includes(color)) return null;
                const finished = pawns.filter(
                  (p) => p.isActive && p.color === color && p.position === HOME_GOALS[color]
                );
                if (finished.length === 0) return null;
                return (
                  <div
                    key={`goal-${color}`}
                    className={`${styles.centerPawns} ${
                      styles[`centerPawns${color[0].toUpperCase() + color.slice(1)}`]
                    }`}
                  >
                    {finished.slice(0, 4).map((p) => renderPawnToken(p, true))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail: Computer 4 (blue) top, You (red) bottom */}
        <div className={styles.sideRail}>
          {renderPlayerPanel('blue')}
          {renderPlayerPanel('red')}
        </div>
      </div>

      <div className={styles.hintBanner}>{actionMessage}</div>

      {winner && (
        <div className={styles.winnerOverlay}>
          <div className={styles.winnerCard}>
            <img src={trophyImageSrc} alt="Victory Trophy" className={styles.winnerTrophy} />
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: COLOR_HEX[winner] }}>
              {(isLiveMatch ? winner === myColor : winner === 'red')
                ? `🎉 ${playerName ? playerName.toUpperCase() : 'YOU'} ARE THE 1st WINNER!`
                : `🏁 ${winner.toUpperCase()} WON 1st PLACE!`}
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#cbd5e1' }}>
              Final Score: <strong style={{ color: '#FFB300' }}>{score} PTS</strong>
              {(isLiveMatch ? winner === myColor : winner === 'red') ? (
                <span
                  style={{
                    display: 'block',
                    color: '#00E676',
                    marginTop: '8px',
                    fontWeight: 800,
                    fontSize: '1rem',
                  }}
                >
                  🎉 1st Winner Qualified! Prize Pool of {activePrizePool} USDT awarded to your wallet!
                </span>
              ) : (
                <span
                  style={{
                    display: 'block',
                    color: '#FF5252',
                    marginTop: '8px',
                    fontWeight: 700,
                  }}
                >
                  Only the 1st Winner takes the {activePrizePool} USDT prize pool. Better luck next tournament!
                </span>
              )}
            </p>
            <button type="button" className={styles.restartBtn} onClick={handleRestartGame}>
              Play Again (Choose Mode)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
