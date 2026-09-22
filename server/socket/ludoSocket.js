
const GameConfig = require('../models/GameConfig');

// Admin-assigned pools (MongoDB) for a Ludo mode — match-er deduct + prize source of truth
async function getLudoPools(mode) {
  const defaults = mode === 4
    ? { entryFee: '2.00', prizePool: '50.00' }
    : { entryFee: '1.00', prizePool: '20.00' };
  try {
    const cfg = await GameConfig.findOne({ gameId: 'ludo-with-friends' }).lean();
    if (!cfg) return defaults;
    if (mode === 4) {
      return {
        entryFee: cfg.ludo4pEntryPool || cfg.entryPool || defaults.entryFee,
        prizePool: cfg.ludo4pPrizePool || cfg.prizePool || defaults.prizePool,
      };
    }
    return {
      entryFee: cfg.ludo2pEntryPool || cfg.entryPool || defaults.entryFee,
      prizePool: cfg.ludo2pPrizePool || cfg.prizePool || defaults.prizePool,
    };
  } catch (_) {
    return defaults;
  }
}

let waitingQueue = []; // { socketId, playerId, playerName, avatar, mode, joinedAt }
const liveRooms = new Map(); // matchId -> { matchId, mode, players, createdAt }
const socketToPlayer = new Map(); // socketId -> { playerId, matchId }

function cleanupQueue() {
  const now = Date.now();
  waitingQueue = waitingQueue.filter((e) => now - e.joinedAt < 45000);
}
setInterval(cleanupQueue, 15000);

async function tryMatch(io, mode) {
  cleanupQueue();
  const needed = mode; // 2P -> 2 players, 4P -> 4 players
  const candidates = waitingQueue.filter((q) => q.mode === mode);
  if (candidates.length < needed) return null;

  const picked = candidates.slice(0, needed);
  // Queue theke soriye dao
  const pickedIds = new Set(picked.map((p) => p.socketId));
  waitingQueue = waitingQueue.filter((q) => !pickedIds.has(q.socketId));

  const matchId = `live_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const colors = mode === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

  const players = picked.map((p, idx) => ({
    playerId: p.playerId,
    socketId: p.socketId,
    name: p.playerName,
    avatar: p.avatar || '👑',
    color: colors[idx],
    isHost: idx === 0,
    isBot: false,
  }));

  // Admin-assigned pools for this match (deduct + prize source of truth)
  const pools = await getLudoPools(mode);

  liveRooms.set(matchId, { matchId, mode, players, entryFee: pools.entryFee, prizePool: pools.prizePool, createdAt: Date.now() });

  // Prottek player ke tar room-e join koriye matched event pathao
  players.forEach((pl) => {
    const sock = io.sockets.sockets.get(pl.socketId);
    if (sock) {
      sock.join(matchId);
      socketToPlayer.set(pl.socketId, { playerId: pl.playerId, matchId });
      sock.emit('ludo:matched', {
        matchId,
        players,
        yourColor: pl.color,
        mode,
        entryFee: pools.entryFee,
        prizePool: pools.prizePool,
        source: 'live_socket',
      });
    }
  });

  console.log(`[LudoSocket] LIVE MATCH ${matchId} (${mode}P): ${players.map((p) => `${p.name}(${p.color})`).join(' vs ')}`);
  return matchId;
}

function initLudoSocket(io) {
  io.on('connection', (socket) => {
    // console.log(`[LudoSocket] connected ${socket.id}`);

    socket.on('ludo:search', (payload = {}) => {
      const {
        playerId = `guest_${socket.id.slice(0, 6)}`,
        playerName = 'Player',
        avatar = '👑',
        mode = 2,
      } = payload;
      const numMode = Number(mode) === 4 ? 4 : 2;

      // Purono entry thakle refresh koro (duplicate atkate)
      waitingQueue = waitingQueue.filter((q) => q.playerId !== playerId && q.socketId !== socket.id);
      waitingQueue.push({
        socketId: socket.id,
        playerId,
        playerName: String(playerName).slice(0, 24),
        avatar,
        mode: numMode,
        joinedAt: Date.now(),
      });
      socketToPlayer.set(socket.id, { playerId, matchId: null });

      socket.emit('ludo:waiting', {
        status: 'waiting',
        mode: numMode,
        queuePosition: waitingQueue.filter((q) => q.mode === numMode).length,
        message: 'Live opponent khujchi... friend aksathe Search chaple same match-e porbe!',
      });

      // Sathe sathe match try koro
      tryMatch(io, numMode);
    });

    socket.on('ludo:cancel', () => {
      waitingQueue = waitingQueue.filter((q) => q.socketId !== socket.id);
      socket.emit('ludo:cancelled', { success: true });
    });

    socket.on('ludo:join-room', ({ matchId } = {}) => {
      if (!matchId) return;
      // Room naam-e join — REST matchId holeo cholbe (relay sudhu room naam use kore)
      socket.join(matchId);
      const prev = socketToPlayer.get(socket.id) || {};
      socketToPlayer.set(socket.id, { ...prev, matchId });
      socket.to(matchId).emit('ludo:opponent-joined', { socketId: socket.id });
    });

    // Gameplay relay: dice roll / pawn move / turn / score / gameover — sob broadcast
    socket.on('ludo:game-action', (action = {}) => {
      const { matchId } = action;
      if (!matchId) return;
      // Sender bade room-er baki sobaike pathao (tumi ja khelba friend live dekhbe)
      socket.to(matchId).emit('ludo:game-action', { ...action, fromSocket: socket.id });
    });

    // Typing/chat chhoto helper (optional): emoji / message
    socket.on('ludo:chat', ({ matchId, text, name } = {}) => {
      if (!matchId) return;
      io.to(matchId).emit('ludo:chat', { text: String(text || '').slice(0, 120), name, at: Date.now() });
    });

    socket.on('disconnect', () => {
      waitingQueue = waitingQueue.filter((q) => q.socketId !== socket.id);
      const info = socketToPlayer.get(socket.id);
      if (info?.matchId) {
        socket.to(info.matchId).emit('ludo:opponent-left', { playerId: info.playerId });
      }
      socketToPlayer.delete(socket.id);
    });
  });

  return { liveRooms, getQueue: () => waitingQueue };
}

module.exports = initLudoSocket;
module.exports.liveRooms = liveRooms;
