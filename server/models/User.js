const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    accountId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    walletType: {
      type: String,
      enum: ['MetaMask', 'Trust Wallet', 'SafePal', 'Rabby Wallet', 'Coinbase Wallet', 'Other'],
      default: 'MetaMask',
    },
    usdtBalance: {
      type: String,
      default: '0.00',
    },
    chainId: {
      type: Number,
      default: 1,
    },
    nonce: {
      type: String,
      default: null,
    },
    nonceExpiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    ludoPlayerName: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helper method to strip sensitive or internal fields when sending user to client
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.nonce;
  delete user.nonceExpiresAt;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
