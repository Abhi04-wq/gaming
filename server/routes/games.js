const express = require('express');
const router = express.Router();
const User = require('../models/User');
const GameConfig = require('../models/GameConfig');

// Admin-assigned pools (MongoDB) for a Ludo mode. Falls back to platform
// defaults only when admin never saved a config.
async function getLudoPools(mode) {
  const defaults = mode === 2
    ? { entryFee: '1.00', prizePool: '20.00' }
    : { entryFee: '2.00', prizePool: '50.00' };
  try {
    const cfg = await GameConfig.findOne({ gameId: 'ludo-with-friends' }).lean();
    if (!cfg) return defaults;
    if (mode === 2) {
      return {
        entryFee: cfg.ludo2pEntryPool || cfg.entryPool || defaults.entryFee,
        prizePool: cfg.ludo2pPrizePool || cfg.prizePool || defaults.prizePool,
      };
    }
    return {
      entryFee: cfg.ludo4pEntryPool || cfg.entryPool || defaults.entryFee,
      prizePool: cfg.ludo4pPrizePool || cfg.prizePool || defaults.prizePool,
    };
  } catch (_) {
    return defaults;
  }
}

// In-memory matchmaking pool
// Format: { queueId, playerId, playerName, avatar, mode, joinedAt, matchId, role }
let matchmakingQueue = [];
// Active rooms: matchId -> { matchId, mode, players, createdAt }
const activeRooms = new Map();

// Realistic bot profiles for fallback
const BOT_POOL = [
  { name: 'Aarav_Pro', avatar: '⚡', rating: 1420 },
  { name: 'Priya_Queen', avatar: '👑', rating: 1390 },
  { name: 'Vikram_Knight', avatar: '🛡️', rating: 1480 },
  { name: 'Sneha_Dice', avatar: '🎲', rating: 1350 },
  { name: 'Rahul_Kolkata', avatar: '🔥', rating: 1460 },
  { name: 'Ananya_Star', avatar: '⭐', rating: 1410 },
  { name: 'Rohan_Master', avatar: '🎯', rating: 1510 },
  { name: 'Meera_Swift', avatar: '🍀', rating: 1380 },
];

function getRandomBot(excludeNames = []) {
  const available = BOT_POOL.filter((b) => !excludeNames.includes(b.name));
  const pool = available.length > 0 ? available : BOT_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Clean up stale queue entries (> 45s)
function cleanupStaleEntries() {
  const now = Date.now();
  matchmakingQueue = matchmakingQueue.filter((entry) => now - entry.joinedAt < 45000);
}

// Periodic cleanup every 30s
setInterval(cleanupStaleEntries, 30000);

// Game API health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    queueLength: matchmakingQueue.length,
    activeRooms: activeRooms.size,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/games/ludo/matchmake
 * Join or search for an online opponent
 * Body: { playerId, playerName, avatar, mode: 2 | 4 }
 */
router.post('/ludo/matchmake', async (req, res) => {
  cleanupStaleEntries();
  const { playerId, playerName = 'Player', avatar = '👑', mode = 2 } = req.body;
  const numMode = Number(mode) === 2 ? 2 : 4;

  const currentUid = playerId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  // Check if player is already waiting
  const existingIndex = matchmakingQueue.findIndex((q) => q.playerId === currentUid);
  if (existingIndex !== -1) {
    const existing = matchmakingQueue[existingIndex];
    if (existing.matchId) {
      const room = activeRooms.get(existing.matchId);
      return res.json({
        success: true,
        status: 'matched',
        matchId: existing.matchId,
        players: room ? room.players : [],
        entryFee: room ? room.entryFee : undefined,
        prizePool: room ? room.prizePool : undefined,
        source: 'live_match',
      });
    }
    // Update timestamp
    existing.joinedAt = Date.now();
    return res.json({
      success: true,
      status: 'waiting',
      queueId: existing.queueId,
      elapsedMs: Date.now() - existing.joinedAt,
    });
  }

  // Find other waiting players for the same mode
  const candidates = matchmakingQueue.filter(
    (q) => !q.matchId && q.mode === numMode && q.playerId !== currentUid
  );

  const neededPlayers = numMode - 1;

  if (candidates.length >= neededPlayers) {
    // Found real player(s)! Match them together
    const matchedOpponents = candidates.slice(0, neededPlayers);
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const playerList = [
      {
        playerId: currentUid,
        name: playerName,
        avatar,
        color: 'red',
        isHost: true,
        isBot: false,
      },
    ];

    const colors = numMode === 2 ? ['yellow'] : ['green', 'yellow', 'blue'];
    matchedOpponents.forEach((opp, idx) => {
      opp.matchId = matchId;
      playerList.push({
        playerId: opp.playerId,
        name: opp.playerName,
        avatar: opp.avatar || '⚡',
        color: colors[idx],
        isHost: false,
        isBot: false,
      });
    });

    // Admin-assigned pools for this match (deduct + prize source of truth)
    const pools = await getLudoPools(numMode);

    activeRooms.set(matchId, {
      matchId,
      mode: numMode,
      players: playerList,
      entryFee: pools.entryFee,
      prizePool: pools.prizePool,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      status: 'matched',
      matchId,
      players: playerList,
      entryFee: pools.entryFee,
      prizePool: pools.prizePool,
      source: 'live_match',
    });
  }

  // No real opponents found yet -> Enqueue current player to wait for incoming searches
  const queueId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const queueEntry = {
    queueId,
    playerId: currentUid,
    playerName,
    avatar,
    mode: numMode,
    joinedAt: Date.now(),
    matchId: null,
  };

  matchmakingQueue.push(queueEntry);

  return res.json({
    success: true,
    status: 'waiting',
    queueId,
    mode: numMode,
    message: 'Searching for online opponent in matchmaking pool...',
  });
});

/**
 * GET /api/games/ludo/matchmake/status/:queueId
 * Poll status of queued player
 */
router.get('/ludo/matchmake/status/:queueId', (req, res) => {
  const { queueId } = req.params;
  const entry = matchmakingQueue.find((q) => q.queueId === queueId);

  if (!entry) {
    return res.json({
      success: false,
      status: 'expired',
      message: 'Queue entry expired or not found',
    });
  }

  if (entry.matchId) {
    const room = activeRooms.get(entry.matchId);
    return res.json({
      success: true,
      status: 'matched',
      matchId: entry.matchId,
      players: room ? room.players : [],
      entryFee: room ? room.entryFee : undefined,
      prizePool: room ? room.prizePool : undefined,
      source: 'live_match',
    });
  }

  const elapsed = Date.now() - entry.joinedAt;
  return res.json({
    success: true,
    status: 'waiting',
    queueId,
    elapsedMs: elapsed,
  });
});

/**
 * POST /api/games/ludo/matchmake/fallback-bot
 * Called when timeout expires and no other human queued: generates realistic bot opponents
 */
router.post('/ludo/matchmake/fallback-bot', async (req, res) => {
  const { queueId, playerName = 'You', avatar = '👑', mode = 2 } = req.body;
  const numMode = Number(mode) === 2 ? 2 : 4;

  // Remove from waiting queue if present
  if (queueId) {
    matchmakingQueue = matchmakingQueue.filter((q) => q.queueId !== queueId);
  }

  const matchId = `bot_match_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const playerList = [
    {
      playerId: 'human_player',
      name: playerName,
      avatar,
      color: 'red',
      isHost: true,
      isBot: false,
    },
  ];

  const colors = numMode === 2 ? ['yellow'] : ['green', 'yellow', 'blue'];
  const usedNames = [playerName];

  colors.forEach((color) => {
    const bot = getRandomBot(usedNames);
    usedNames.push(bot.name);
    playerList.push({
      playerId: `bot_${color}`,
      name: bot.name,
      avatar: bot.avatar,
      rating: bot.rating,
      color,
      isHost: false,
      isBot: true,
    });
  });

  // Admin-assigned pools for this match (deduct + prize source of truth)
  const pools = await getLudoPools(numMode);

  activeRooms.set(matchId, {
    matchId,
    mode: numMode,
    players: playerList,
    entryFee: pools.entryFee,
    prizePool: pools.prizePool,
    createdAt: Date.now(),
  });

  return res.json({
    success: true,
    status: 'matched',
    matchId,
    players: playerList,
    entryFee: pools.entryFee,
    prizePool: pools.prizePool,
    source: 'bot_fallback',
  });
});

/**
 * POST /api/games/ludo/matchmake/cancel
 */
router.post('/ludo/matchmake/cancel', (req, res) => {
  const { queueId } = req.body;
  if (queueId) {
    matchmakingQueue = matchmakingQueue.filter((q) => q.queueId !== queueId);
  }
  res.json({ success: true, message: 'Matchmaking cancelled' });
});

/**
 * POST /api/games/ludo/player-name
 * Save Ludo player name for first-time or returning player in MongoDB User record
 */
router.post('/ludo/player-name', async (req, res) => {
  try {
    const { walletAddress, name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Player name is required' });
    }
    const cleanName = name.trim().slice(0, 24);
    let updatedUser = null;
    if (walletAddress) {
      updatedUser = await User.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { $set: { ludoPlayerName: cleanName } },
        { new: true }
      );
    }
    return res.json({
      success: true,
      name: cleanName,
      user: updatedUser ? updatedUser.toPublicJSON() : null,
    });
  } catch (err) {
    console.error('[Save Ludo Player Name Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/games/ludo/player-name/:walletAddress
 * Retrieve saved Ludo player name
 */
router.get('/ludo/player-name/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!walletAddress) {
      return res.json({ success: true, name: null });
    }
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    return res.json({
      success: true,
      name: user?.ludoPlayerName || null,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
