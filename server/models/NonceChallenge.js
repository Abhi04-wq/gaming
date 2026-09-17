const mongoose = require('mongoose');

const nonceChallengeSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
  },
  nonce: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    enum: ['register', 'login', 'auth'],
    default: 'auth',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // MongoDB TTL: document automatically deletes after 5 minutes
  },
});

const NonceChallenge = mongoose.model('NonceChallenge', nonceChallengeSchema);

module.exports = NonceChallenge;
