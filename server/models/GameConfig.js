const mongoose = require('mongoose');

// Platform-wide game pool configuration set from the Admin Panel.
// User panel (any browser/device) reads these via GET /api/game-config,
// so admin entry/prize pool changes apply to every player.
const gameConfigSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    entryPool: { type: String, default: '1.00' },
    prizePool: { type: String, default: '100.00' },
    thresholdScore: { type: String, default: '500' },
    ludo2pEntryPool: { type: String, default: '1.00' },
    ludo2pPrizePool: { type: String, default: '20.00' },
    ludo4pEntryPool: { type: String, default: '2.00' },
    ludo4pPrizePool: { type: String, default: '50.00' },
    status: { type: String, enum: ['active', 'paused'], default: 'active' },
  },
  { timestamps: true }
);

const GameConfig = mongoose.model('GameConfig', gameConfigSchema);

module.exports = GameConfig;
