const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['game_entry', 'prize_reward', 'deposit', 'withdrawal', 'bonus', 'adjustment'],
      default: 'game_entry',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    grossReward: {
      type: Number,
      default: null,
    },
    deductionAmount: {
      type: Number,
      default: null,
    },
    deductionPercent: {
      type: Number,
      default: null,
    },
    netReward: {
      type: Number,
      default: null,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USDT',
    },
    gameId: {
      type: String,
      default: null,
      index: true,
    },
    gameTitle: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast user income and transaction history lookups
transactionSchema.index({ walletAddress: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
