const express = require('express');
const router = express.Router();
const GameConfig = require('../models/GameConfig');

// Admin guard: client admin login is static (VITE_ADMIN_EMAIL/PASSWORD).
// Admin panel sends those same credentials as headers; server compares
// with its own env so only the admin can change pools.
function adminGuard(req, res, next) {
  const email = (req.headers['x-admin-email'] || '').trim().toLowerCase();
  const password = (req.headers['x-admin-password'] || '').trim();
  const validEmail = (process.env.ADMIN_EMAIL || 'admin@loyaltygame.com').trim().toLowerCase();
  const validPassword = (process.env.ADMIN_PASSWORD || 'Admin@12345').trim();
  if (email === validEmail && password === validPassword) return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
}

const PUBLIC_FIELDS =
  'gameId entryPool prizePool thresholdScore ludo2pEntryPool ludo2pPrizePool ludo4pEntryPool ludo4pPrizePool status updatedAt';

/**
 * GET /api/game-config
 * Public: every user panel fetches this on load so admin pool
 * changes (entry/prize) show up on any browser/device.
 */
router.get('/', async (req, res) => {
  try {
    const docs = await GameConfig.find({}).select(PUBLIC_FIELDS).lean();
    const configs = {};
    docs.forEach((d) => {
      configs[d.gameId] = d;
    });
    return res.json({ success: true, configs });
  } catch (err) {
    console.error('[GameConfig List Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/game-config/:gameId
 * Public: single game pools (used by Ludo board).
 */
router.get('/:gameId', async (req, res) => {
  try {
    const doc = await GameConfig.findOne({ gameId: req.params.gameId })
      .select(PUBLIC_FIELDS)
      .lean();
    if (!doc) return res.json({ success: true, config: null });
    return res.json({ success: true, config: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/game-config/:gameId
 * Admin only: create/update pools for a game.
 * Body: { entryPool, prizePool, thresholdScore, ludo2pEntryPool, ludo2pPrizePool,
 *         ludo4pEntryPool, ludo4pPrizePool, status }
 */
router.post('/:gameId', adminGuard, async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!gameId) return res.status(400).json({ success: false, message: 'gameId required' });

    const allowed = [
      'entryPool',
      'prizePool',
      'thresholdScore',
      'ludo2pEntryPool',
      'ludo2pPrizePool',
      'ludo4pEntryPool',
      'ludo4pPrizePool',
      'status',
    ];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined && req.body[k] !== null) {
        update[k] = String(req.body[k]);
      }
    });

    const doc = await GameConfig.findOneAndUpdate(
      { gameId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).select(PUBLIC_FIELDS);

    // Push live to connected players via socket (if available)
    try {
      const io = req.app.get('io');
      if (io) io.emit('game-config:updated', { gameId, config: doc });
    } catch (_) {}

    return res.json({ success: true, config: doc });
  } catch (err) {
    console.error('[GameConfig Save Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
