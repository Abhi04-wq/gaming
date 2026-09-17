const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { getUsdtBalanceFromRpc } = require('../utils/usdtContract');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Helper to format clean game title from gameId
const formatGameTitle = (gameId, fallbackTitle) => {
  if (fallbackTitle) return fallbackTitle;
  if (!gameId) return 'Arcade Game';
  const nameMap = {
    'valley-of-terror': 'Valley of Terror',
    'fruit-chop': 'Fruit Chop',
    'chess-grandmaster': 'Chess Grandmaster',
    'ludo-with-friends': 'Play With Friends Ludo',
    'ludo-dash': 'Ludo Dash Live',
    'sudoku-classic': 'Sudoku Classic',
    'bubble-shooter-classic': 'Bubble Shooter Classic',
    'spell-wizard': 'Spell Wizard',
    'tic-tac-toe': 'Tic Tac Toe Master',
  };
  return nameMap[gameId] || gameId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

// @route   GET /api/wallet/balance
// @desc    Fetch live USDT balance for a wallet address from Ethereum/selected network
// @access  Public
router.get('/balance', async (req, res) => {
  try {
    const { address, chainId = 1 } = req.query;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const normalizedAddress = address.toLowerCase();

    // Check user platform balance in DB
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });
    if (existingUser) {
      return res.json({
        success: true,
        walletAddress: normalizedAddress,
        balance: existingUser.usdtBalance || '50.00',
        symbol: 'USDT',
        chainId: Number(chainId),
      });
    }

    return res.json({
      success: true,
      walletAddress: normalizedAddress,
      balance: '50.00',
      symbol: 'USDT',
      chainId: Number(chainId),
    });
  } catch (error) {
    console.error('[Wallet Balance Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch USDT token balance.',
      balance: '50.00',
      symbol: 'USDT',
    });
  }
});

// @route   POST /api/wallet/deduct-entry
// @desc    Deduct entry pool fee from user balance when joining a game and save DEBIT transaction in DB
// @access  Public / Authenticated
router.post('/deduct-entry', async (req, res) => {
  try {
    const { address, gameId, gameTitle, amount } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const entryFee = parseFloat(amount || '1.00');
    if (isNaN(entryFee) || entryFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entry pool amount.',
      });
    }

    const normalizedAddress = address.toLowerCase();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Wallet account not found.',
      });
    }

    const currentBalance = parseFloat(user.usdtBalance || '50.00');

    if (currentBalance < entryFee) {
      return res.status(400).json({
        success: false,
        message: `Insufficient USDT balance. Required: ${entryFee.toFixed(2)} USDT, Available: ${currentBalance.toFixed(2)} USDT.`,
        currentBalance: currentBalance.toFixed(2),
        required: entryFee.toFixed(2),
      });
    }

    const newBalance = Math.max(0, currentBalance - entryFee).toFixed(2);
    user.usdtBalance = newBalance;
    await user.save();

    const title = formatGameTitle(gameId, gameTitle);
    const referenceId = `TX-DEB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Record DEBIT transaction in MongoDB database
    let savedTransaction = null;
    try {
      savedTransaction = await Transaction.create({
        walletAddress: normalizedAddress,
        userId: user._id,
        type: 'debit',
        category: 'game_entry',
        amount: entryFee,
        balanceBefore: currentBalance,
        balanceAfter: parseFloat(newBalance),
        currency: 'USDT',
        gameId: gameId || null,
        gameTitle: title,
        description: `Game Entry Fee - ${title}`,
        referenceId,
        status: 'completed',
      });
      console.log(`[Transaction Saved: DEBIT] ${referenceId} | -${entryFee.toFixed(2)} USDT | New Bal: ${newBalance} USDT`);
    } catch (txErr) {
      console.error('[Transaction Save Error (Debit)]', txErr);
    }

    console.log(`[Game Entry Deducted] User: ${normalizedAddress} | Game: ${gameId} | Deducted: -${entryFee.toFixed(2)} USDT | New Balance: ${newBalance} USDT`);

    return res.json({
      success: true,
      deducted: entryFee.toFixed(2),
      newBalance: user.usdtBalance,
      gameId,
      referenceId,
      transaction: savedTransaction,
      message: `Entry pool fee deducted: -${entryFee.toFixed(2)} USDT. Remaining balance: ${newBalance} USDT.`,
    });
  } catch (error) {
    console.error('[Deduct Entry Fee Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process game entry deduction.',
    });
  }
});

// @route   POST /api/wallet/credit-prize
// @desc    Credit prize pool reward when player score reaches/exceeds threshold and save CREDIT transaction in DB
router.post('/credit-prize', async (req, res) => {
  try {
    const { address, gameId, gameTitle, score, threshold, prizeAmount } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const prize = parseFloat(prizeAmount || '0');
    if (isNaN(prize) || prize <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prize pool reward amount.',
      });
    }

    const normalizedAddress = address.toLowerCase();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Wallet account not found.',
      });
    }

    const currentBalance = parseFloat(user.usdtBalance || '50.00');
    const newBalance = (currentBalance + prize).toFixed(2);
    user.usdtBalance = newBalance;
    await user.save();

    const title = formatGameTitle(gameId, gameTitle);
    const referenceId = `TX-CRE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Record CREDIT transaction in MongoDB database
    let savedTransaction = null;
    try {
      savedTransaction = await Transaction.create({
        walletAddress: normalizedAddress,
        userId: user._id,
        type: 'credit',
        category: 'prize_reward',
        amount: prize,
        balanceBefore: currentBalance,
        balanceAfter: parseFloat(newBalance),
        currency: 'USDT',
        gameId: gameId || null,
        gameTitle: title,
        description: `Prize Pool Reward - ${title} (Score: ${score} >= ${threshold} PTS)`,
        referenceId,
        status: 'completed',
      });
      console.log(`[Transaction Saved: CREDIT] ${referenceId} | +${prize.toFixed(2)} USDT | New Bal: ${newBalance} USDT`);
    } catch (txErr) {
      console.error('[Transaction Save Error (Credit)]', txErr);
    }

    console.log(
      `[Prize Pool Won & Credited] User: ${normalizedAddress} | Game: ${gameId} | Score: ${score} >= ${threshold} | Prize: +${prize.toFixed(2)} USDT | New Balance: ${newBalance} USDT`
    );

    return res.json({
      success: true,
      won: true,
      score,
      threshold,
      prizeCredited: prize.toFixed(2),
      newBalance: user.usdtBalance,
      gameId,
      referenceId,
      transaction: savedTransaction,
      message: `🏆 Congratulations! Score ${score} reached threshold ${threshold}. Prize pool reward of +${prize.toFixed(2)} USDT credited!`,
    });
  } catch (error) {
    console.error('[Credit Prize Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to credit prize pool reward.',
    });
  }
});

// @route   POST /api/wallet/deposit
// @desc    Deposit / Add USDT funds to user wallet and save CREDIT transaction in DB
router.post('/deposit', async (req, res) => {
  try {
    const { address, amount, description } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const depositAmount = parseFloat(amount || '25.00');
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deposit amount.',
      });
    }

    const normalizedAddress = address.toLowerCase();
    let user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Wallet account not found.',
      });
    }

    const currentBalance = parseFloat(user.usdtBalance || '50.00');
    const newBalance = (currentBalance + depositAmount).toFixed(2);
    user.usdtBalance = newBalance;
    await user.save();

    const referenceId = `TX-DEP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const savedTransaction = await Transaction.create({
      walletAddress: normalizedAddress,
      userId: user._id,
      type: 'credit',
      category: 'deposit',
      amount: depositAmount,
      balanceBefore: currentBalance,
      balanceAfter: parseFloat(newBalance),
      currency: 'USDT',
      description: description || `USDT Wallet Deposit (+${depositAmount.toFixed(2)} USDT)`,
      referenceId,
      status: 'completed',
    });

    return res.json({
      success: true,
      depositAmount: depositAmount.toFixed(2),
      newBalance: user.usdtBalance,
      referenceId,
      transaction: savedTransaction,
      message: `Successfully deposited +${depositAmount.toFixed(2)} USDT! New balance: ${newBalance} USDT.`,
    });
  } catch (error) {
    console.error('[Wallet Deposit Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deposit.',
    });
  }
});

// @route   GET /api/wallet/income-details
// @desc    Get comprehensive income details (credits, debits, totals, net profit, and history)
// @access  Public / Authenticated
router.get('/income-details', async (req, res) => {
  try {
    const rawAddress = req.query.address || req.query.walletAddress;
    const { type, limit = 100 } = req.query;

    if (!rawAddress || !ethers.isAddress(rawAddress)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const normalizedAddress = rawAddress.toLowerCase();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    // Filter by type if provided ('credit' | 'debit')
    const query = { walletAddress: normalizedAddress };
    if (type && (type === 'credit' || type === 'debit')) {
      query.type = type;
    }

    // Fetch all transactions for this user
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 100)
      .lean();

    // Compute aggregate stats across ALL transactions for this address
    const allUserTxs = await Transaction.find({ walletAddress: normalizedAddress }).lean();

    let totalCredit = 0;
    let totalDebit = 0;
    let creditCount = 0;
    let debitCount = 0;

    for (const tx of allUserTxs) {
      if (tx.status === 'completed') {
        if (tx.type === 'credit') {
          totalCredit += Number(tx.amount || 0);
          creditCount += 1;
        } else if (tx.type === 'debit') {
          totalDebit += Number(tx.amount || 0);
          debitCount += 1;
        }
      }
    }

    const netEarnings = totalCredit - totalDebit;

    return res.json({
      success: true,
      walletAddress: normalizedAddress,
      currentBalance: user ? user.usdtBalance : '50.00',
      summary: {
        totalCredit: totalCredit.toFixed(2),
        totalDebit: totalDebit.toFixed(2),
        netEarnings: netEarnings.toFixed(2),
        isProfit: netEarnings >= 0,
        creditCount,
        debitCount,
        totalTransactions: allUserTxs.length,
      },
      transactions,
    });
  } catch (error) {
    console.error('[Income Details Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch income details.',
      summary: {
        totalCredit: '0.00',
        totalDebit: '0.00',
        netEarnings: '0.00',
        creditCount: 0,
        debitCount: 0,
        totalTransactions: 0,
      },
      transactions: [],
    });
  }
});

// @route   GET /api/wallet/all-transactions
// @desc    Admin: get ALL users income history (every credit + debit saved in DB)
// @access  Public (admin console uses static session, not JWT)
router.get('/all-transactions', async (req, res) => {
  try {
    const { type, search, limit = 200, page = 1 } = req.query;

    const query = {};
    if (type && (type === 'credit' || type === 'debit')) {
      query.type = type;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { walletAddress: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { referenceId: { $regex: q, $options: 'i' } },
        { gameTitle: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
      ];
    }

    const perPage = Math.min(parseInt(limit, 10) || 200, 500);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean();

    const totalTransactions = await Transaction.countDocuments(query);

    // Platform-wide totals (all completed transactions)
    const totals = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalCredit = 0;
    let totalDebit = 0;
    let creditCount = 0;
    let debitCount = 0;
    for (const row of totals) {
      if (row._id === 'credit') {
        totalCredit = row.total || 0;
        creditCount = row.count || 0;
      } else if (row._id === 'debit') {
        totalDebit = row.total || 0;
        debitCount = row.count || 0;
      }
    }

    return res.json({
      success: true,
      summary: {
        totalCredit: Number(totalCredit).toFixed(2),
        totalDebit: Number(totalDebit).toFixed(2),
        netEarnings: Number(totalCredit - totalDebit).toFixed(2),
        creditCount,
        debitCount,
        totalTransactions,
      },
      transactions,
      page: pageNum,
      perPage,
    });
  } catch (error) {
    console.error('[Admin All Transactions Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all income history.',
      summary: {
        totalCredit: '0.00',
        totalDebit: '0.00',
        netEarnings: '0.00',
        creditCount: 0,
        debitCount: 0,
        totalTransactions: 0,
      },
      transactions: [],
    });
  }
});

// @route   GET /api/wallet/admin-stats
// @desc    Admin: platform-wide stats computed live from database (users + transactions)
// @access  Public (admin console uses static session, not JWT)
router.get('/admin-stats', async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    const totalTransactions = await Transaction.countDocuments({});

    const totals = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let totalCredit = 0;
    let totalDebit = 0;
    let creditCount = 0;
    let debitCount = 0;
    for (const row of totals) {
      if (row._id === 'credit') {
        totalCredit = row.total || 0;
        creditCount = row.count || 0;
      } else if (row._id === 'debit') {
        totalDebit = row.total || 0;
        debitCount = row.count || 0;
      }
    }

    return res.json({
      success: true,
      stats: {
        userCount,
        totalTransactions,
        totalCredit: Number(totalCredit).toFixed(2),
        totalDebit: Number(totalDebit).toFixed(2),
        netEarnings: Number(totalCredit - totalDebit).toFixed(2),
        creditCount,
        debitCount,
      },
    });
  } catch (error) {
    console.error('[Admin Stats Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats from database.',
    });
  }
});

module.exports = router;

