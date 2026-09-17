const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const NonceChallenge = require('../models/NonceChallenge');
const { protect } = require('../middleware/auth');
const { generateAccountId } = require('../utils/accountId');

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      walletAddress: user.walletAddress,
      accountId: user.accountId,
    },
    process.env.JWT_SECRET || 'super_secret_web3_production_jwt_key_9823471092384',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/check-wallet
// @desc    Check if a wallet address is already registered
// @access  Public
router.post('/check-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid EVM wallet address.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });

    return res.json({
      success: true,
      exists: !!existingUser,
      walletAddress: normalizedAddress,
    });
  } catch (error) {
    console.error('[Check Wallet Error]', error);
    return res.status(500).json({ success: false, message: 'Server error checking wallet status.' });
  }
});

// @route   POST /api/auth/nonce
// @desc    Generate a secure authentication nonce challenge
// @access  Public
router.post('/nonce', async (req, res) => {
  try {
    const { walletAddress, action = 'auth' } = req.body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid EVM wallet address.',
      });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if wallet exists in MongoDB
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });

    // Generate random 6-digit numeric nonce (e.g. 829174)
    const nonce = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Math.floor(Date.now() / 1000);

    // Standard readable authentication message
    const message = `Sign this message to login to MyWeb3App.\n\nNonce: ${nonce}\nWallet: ${normalizedAddress}\nTimestamp: ${timestamp}`;

    // Remove any previous active challenge for this wallet to avoid stale challenges
    await NonceChallenge.deleteMany({ walletAddress: normalizedAddress });

    // Save fresh challenge with 5 min TTL
    await NonceChallenge.create({
      walletAddress: normalizedAddress,
      nonce,
      message,
      action,
    });

    // If existing user, also store nonce reference
    if (existingUser) {
      existingUser.nonce = nonce;
      existingUser.nonceExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await existingUser.save();
    }

    return res.json({
      success: true,
      nonce,
      message,
      walletAddress: normalizedAddress,
      exists: !!existingUser,
    });
  } catch (error) {
    console.error('[Nonce Error]', error);
    return res.status(500).json({ success: false, message: 'Failed to generate authentication challenge.' });
  }
});

// @route   POST /api/auth/register
// @desc    Verify signature and create a new Web3 user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      walletAddress,
      signature,
      nonce,
      walletType = 'MetaMask',
      chainId = 1,
      usdtBalance = '0.00',
    } = req.body;

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress, signature, and nonce are required.',
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid EVM wallet address.' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user already registered
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This wallet is already registered. Please login instead.',
        walletAddress: normalizedAddress,
      });
    }

    // Find valid nonce challenge
    const challenge = await NonceChallenge.findOne({
      walletAddress: normalizedAddress,
      nonce: nonce.toString(),
    });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired authentication challenge. Please request a new nonce.',
      });
    }

    // Cryptographic signature verification using ethers.js
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(challenge.message, signature);
    } catch (sigErr) {
      console.error('[Verify Signature Error]', sigErr.message);
      return res.status(400).json({
        success: false,
        message: 'Cryptographic signature verification failed. Invalid signature format.',
      });
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return res.status(401).json({
        success: false,
        message: 'Signature does not match the provided wallet address. Authentication rejected.',
      });
    }

    // Delete challenge to prevent replay attacks
    await NonceChallenge.deleteOne({ _id: challenge._id });

    // Generate unique accountId (e.g. USR-8F42A1)
    let accountId = generateAccountId();
    // Ensure uniqueness
    let existsId = await User.findOne({ accountId });
    while (existsId) {
      accountId = generateAccountId();
      existsId = await User.findOne({ accountId });
    }

    // Create user in MongoDB
    const newUser = await User.create({
      accountId,
      walletAddress: normalizedAddress,
      walletType: ['MetaMask', 'Trust Wallet', 'SafePal', 'Rabby Wallet', 'Coinbase Wallet'].includes(walletType)
        ? walletType
        : 'MetaMask',
      usdtBalance: String(usdtBalance || '0.00'),
      chainId: Number(chainId) || 1,
      lastLoginAt: new Date(),
      isActive: true,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Wallet registered successfully! Welcome to MyWeb3App.',
      token,
      user: newUser.toPublicJSON(),
    });
  } catch (error) {
    console.error('[Register Error]', error);
    return res.status(500).json({ success: false, message: 'Server error during wallet registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Verify signature and authenticate existing user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { walletAddress, signature, nonce, usdtBalance, chainId } = req.body;

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        message: 'walletAddress, signature, and nonce are required.',
      });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid EVM wallet address.' });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Find registered user in MongoDB
    const user = await User.findOne({ walletAddress: normalizedAddress });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not registered. Please create an account.',
        walletAddress: normalizedAddress,
      });
    }

    // Find matching challenge
    const challenge = await NonceChallenge.findOne({
      walletAddress: normalizedAddress,
      nonce: nonce.toString(),
    });

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: 'Authentication challenge expired or invalid. Please try logging in again.',
      });
    }

    // Verify cryptographic signature with ethers.js
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(challenge.message, signature);
    } catch (sigErr) {
      console.error('[Verify Signature Error]', sigErr.message);
      return res.status(400).json({
        success: false,
        message: 'Signature verification failed. Invalid signature.',
      });
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      return res.status(401).json({
        success: false,
        message: 'Signature does not match the wallet owner. Access denied.',
      });
    }

    // Invalidate nonce challenge
    await NonceChallenge.deleteOne({ _id: challenge._id });

    // Update user login timestamp & balance if provided
    user.lastLoginAt = new Date();
    user.nonce = null;
    user.nonceExpiresAt = null;
    if (usdtBalance !== undefined) {
      user.usdtBalance = String(usdtBalance);
    }
    if (chainId !== undefined) {
      user.chainId = Number(chainId);
    }
    await user.save();

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful. Welcome back!',
      token,
      user: user.toPublicJSON(),
    });
  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently authenticated user profile
// @access  Private (JWT)
router.get('/me', protect, async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user.toPublicJSON(),
    });
  } catch (error) {
    console.error('[Auth Me Error]', error);
    return res.status(500).json({ success: false, message: 'Error retrieving profile.' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Public
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
