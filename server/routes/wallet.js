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
    'shape-smash': 'Loyalty Bubble',
    'hill-top-tanks': 'Loyalty Shooting',
    'guess-the-flag': 'Loyalty Bubble',
    'hex-burst': 'Loyalty Mindrush',
    'traffic-command': 'Loyalty Racing',
    'road-safety': 'Loyalty Racing',
    'furious-speed': 'Loyalty Racing',
    'slide-and-divide': 'Loyalty MemoryX',
    'valley-of-terror': 'Valley of Terror',
    'bottle-shoot': 'Bottle Shoot',
    'fruit-chop': 'Fruit Chop',
    'chess-grandmaster': 'Loyalty Chess',
    'chess': 'Loyalty Chess',
    'ludo-with-friends': 'Loyalty Ludo',
    'ludo-dash': 'Loyalty Ludo',
    'ludo': 'Loyalty Ludo',
    'sudoku-classic': 'Loyalty Puzzle Verse',
    'shade-shuffle': 'Shade Shuffle',
    'bubble-shooter-classic': 'Bubble Shooter Classic',
    'word-finder': 'Loyalty Quiz',
    'spell-wizard': 'Spell Wizard',
    'carrom-hero': 'Loyalty Carrom',
    'carrom': 'Loyalty Carrom',
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

    // Check live on-chain balance via RPC
    let onChainBalance = null;
    try {
      const rpcData = await getUsdtBalanceFromRpc(normalizedAddress, Number(chainId) || 1);
      if (rpcData && rpcData.formatted && parseFloat(rpcData.formatted) > 0) {
        onChainBalance = parseFloat(rpcData.formatted).toFixed(2);
      }
    } catch (_) { }

    // Check user platform balance in DB
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });
    if (existingUser) {
      // If user document still has legacy 50.00 dummy value, clear it immediately
      if (existingUser.usdtBalance === '50.00') {
        existingUser.usdtBalance = onChainBalance || '0.00';
        await existingUser.save();
      } else if (onChainBalance && parseFloat(onChainBalance) > parseFloat(existingUser.usdtBalance || '0')) {
        existingUser.usdtBalance = onChainBalance;
        await existingUser.save();
      }

      return res.json({
        success: true,
        walletAddress: normalizedAddress,
        balance: existingUser.usdtBalance !== undefined && existingUser.usdtBalance !== null ? existingUser.usdtBalance : '0.00',
        symbol: 'LXT',
        chainId: Number(chainId),
      });
    }

    return res.json({
      success: true,
      walletAddress: normalizedAddress,
      balance: onChainBalance || '0.00',
      symbol: 'LXT',
      chainId: Number(chainId),
    });
  } catch (error) {
    console.error('[Wallet Balance Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch LXT token balance.',
      balance: '0.00',
      symbol: 'LXT',
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

    const currentBalance = parseFloat(
      user.usdtBalance !== undefined && user.usdtBalance !== null && user.usdtBalance !== ''
        ? user.usdtBalance
        : '0.00'
    );

    if (currentBalance < entryFee) {
      return res.status(400).json({
        success: false,
        message: `Insufficient LXT balance. Required: ${entryFee.toFixed(2)} LXT, Available: ${currentBalance.toFixed(2)} LXT.`,
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
        currency: 'LXT',
        gameId: gameId || null,
        gameTitle: title,
        description: `Game Entry Fee - ${title}`,
        referenceId,
        status: 'completed',
      });
      console.log(`[Transaction Saved: DEBIT] ${referenceId} | -${entryFee.toFixed(2)} LXT | New Bal: ${newBalance} LXT`);
    } catch (txErr) {
      console.error('[Transaction Save Error (Debit)]', txErr);
    }

    console.log(`[Game Entry Deducted] User: ${normalizedAddress} | Game: ${gameId} | Deducted: -${entryFee.toFixed(2)} LXT | New Balance: ${newBalance} LXT`);

    return res.json({
      success: true,
      deducted: entryFee.toFixed(2),
      newBalance: user.usdtBalance,
      gameId,
      referenceId,
      transaction: savedTransaction,
      message: `Entry pool fee deducted: -${entryFee.toFixed(2)} LXT. Remaining balance: ${newBalance} LXT.`,
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
// @desc    Credit prize pool reward when player score reaches/exceeds threshold (deducts 25% platform cut, updates 75% to user account)
router.post('/credit-prize', async (req, res) => {
  try {
    const { address, gameId, gameTitle, score, threshold, prizeAmount } = req.body;

    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'A valid EVM wallet address is required.',
      });
    }

    const gross = parseFloat(prizeAmount || '0');
    if (isNaN(gross) || gross <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid prize pool reward amount.',
      });
    }

    // 25% deduction rule: Cut 25% from reward, credit 75% to user account
    const deductionPercent = 25;
    const deductionAmount = Number(((gross * deductionPercent) / 100).toFixed(2));
    const netReward = Number((gross - deductionAmount).toFixed(2));

    const normalizedAddress = address.toLowerCase();
    const user = await User.findOne({ walletAddress: normalizedAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Wallet account not found.',
      });
    }

    const currentBalance = parseFloat(
      user.usdtBalance !== undefined && user.usdtBalance !== null && user.usdtBalance !== ''
        ? user.usdtBalance
        : '0.00'
    );
    // Update user's account with 75% of the reward
    const newBalance = (currentBalance + netReward).toFixed(2);
    user.usdtBalance = newBalance;
    await user.save();

    const title = formatGameTitle(gameId, gameTitle);
    const referenceId = `TX-CRE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Record CREDIT transaction in MongoDB database with 25% cut metadata
    let savedTransaction = null;
    try {
      savedTransaction = await Transaction.create({
        walletAddress: normalizedAddress,
        userId: user._id,
        type: 'credit',
        category: 'prize_reward',
        amount: netReward, // 75% added to account
        grossReward: gross, // 100% full prize
        deductionAmount, // 25% platform cut
        deductionPercent,
        netReward, // 75% net reward
        balanceBefore: currentBalance,
        balanceAfter: parseFloat(newBalance),
        currency: 'LXT',
        gameId: gameId || null,
        gameTitle: title,
        description: `Prize Pool Reward - ${title} (Gross: ${gross.toFixed(2)} LXT, 25% Platform Cut: -${deductionAmount.toFixed(2)} LXT, 75% Credited: +${netReward.toFixed(2)} LXT | Score: ${score} >= ${threshold} PTS)`,
        referenceId,
        status: 'completed',
      });
      console.log(
        `[Transaction Saved: CREDIT (75%)] ${referenceId} | Gross: ${gross.toFixed(2)} LXT | 25% Cut: -${deductionAmount.toFixed(2)} LXT | Net: +${netReward.toFixed(2)} LXT | New Bal: ${newBalance} LXT`
      );
    } catch (txErr) {
      console.error('[Transaction Save Error (Credit)]', txErr);
    }

    console.log(
      `[Prize Pool Won & 75% Credited] User: ${normalizedAddress} | Game: ${gameId} | Gross: ${gross.toFixed(2)} LXT | 25% Cut: -${deductionAmount.toFixed(2)} LXT | Net: +${netReward.toFixed(2)} LXT | New Balance: ${newBalance} LXT`
    );

    return res.json({
      success: true,
      won: true,
      score,
      threshold,
      grossReward: gross.toFixed(2),
      deductionAmount: deductionAmount.toFixed(2),
      deductionPercent,
      netReward: netReward.toFixed(2),
      prizeCredited: netReward.toFixed(2),
      newBalance: user.usdtBalance,
      gameId,
      referenceId,
      transaction: savedTransaction,
      message: `🏆 Congratulations! Score ${score} reached target ${threshold}. Gross Reward: ${gross.toFixed(2)} LXT (-25% platform cut: ${deductionAmount.toFixed(2)} LXT) -> +${netReward.toFixed(2)} LXT (75%) credited to your balance!`,
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

    const currentBalance = parseFloat(
      user.usdtBalance !== undefined && user.usdtBalance !== null && user.usdtBalance !== ''
        ? user.usdtBalance
        : '0.00'
    );
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
      currency: 'LXT',
      description: description || `LXT Wallet Deposit (+${depositAmount.toFixed(2)} LXT)`,
      referenceId,
      status: 'completed',
    });

    return res.json({
      success: true,
      depositAmount: depositAmount.toFixed(2),
      newBalance: user.usdtBalance,
      referenceId,
      transaction: savedTransaction,
      message: `Successfully deposited +${depositAmount.toFixed(2)} LXT! New balance: ${newBalance} LXT.`,
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
      currentBalance: user && user.usdtBalance !== undefined && user.usdtBalance !== null ? user.usdtBalance : '0.00',
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

// @route   GET /api/wallet/reward-deductions
// @desc    Admin: List all 25% reward deductions with player address, game, gross prize, 25% cut, net credit, and timestamps
// @access  Public (Admin Console)
router.get('/reward-deductions', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 200 } = req.query;

    const query = {
      $or: [
        { category: 'prize_reward' },
        { deductionAmount: { $gt: 0 } },
      ],
      status: 'completed',
    };

    if (search && search.trim()) {
      const q = search.trim();
      query.$and = [
        {
          $or: [
            { walletAddress: { $regex: q, $options: 'i' } },
            { gameTitle: { $regex: q, $options: 'i' } },
            { referenceId: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
          ],
        },
      ];
    }

    const perPage = Math.min(parseInt(limit, 10) || 200, 500);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);

    const deductions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean();

    const totalDeductionsCount = await Transaction.countDocuments(query);

    // Compute aggregate metrics for all reward deductions
    const allDeductionTxs = await Transaction.find({
      $or: [
        { category: 'prize_reward' },
        { deductionAmount: { $gt: 0 } },
      ],
      status: 'completed',
    }).lean();

    let totalDeductionsCollected = 0;
    let totalGrossRewards = 0;
    let totalNetRewardsCredited = 0;

    const formattedList = deductions.map((tx) => {
      const gross = tx.grossReward !== null && tx.grossReward !== undefined
        ? tx.grossReward
        : (tx.deductionAmount ? tx.amount + tx.deductionAmount : tx.amount);
      const cut = tx.deductionAmount !== null && tx.deductionAmount !== undefined
        ? tx.deductionAmount
        : 0;
      const net = tx.netReward !== null && tx.netReward !== undefined
        ? tx.netReward
        : tx.amount;

      return {
        ...tx,
        grossReward: Number(gross).toFixed(2),
        deductionAmount: Number(cut).toFixed(2),
        deductionPercent: tx.deductionPercent || 25,
        netReward: Number(net).toFixed(2),
      };
    });

    for (const tx of allDeductionTxs) {
      const gross = tx.grossReward !== null && tx.grossReward !== undefined
        ? tx.grossReward
        : (tx.deductionAmount ? tx.amount + tx.deductionAmount : tx.amount);
      const cut = tx.deductionAmount !== null && tx.deductionAmount !== undefined
        ? tx.deductionAmount
        : 0;
      const net = tx.netReward !== null && tx.netReward !== undefined
        ? tx.netReward
        : tx.amount;

      totalGrossRewards += gross;
      totalDeductionsCollected += cut;
      totalNetRewardsCredited += net;
    }

    return res.json({
      success: true,
      summary: {
        totalGrossRewards: Number(totalGrossRewards).toFixed(2),
        totalDeductionsCollected: Number(totalDeductionsCollected).toFixed(2),
        totalNetRewardsCredited: Number(totalNetRewardsCredited).toFixed(2),
        totalCount: totalDeductionsCount,
        deductionRate: '25%',
      },
      deductions: formattedList,
      page: pageNum,
      perPage,
      totalCount: totalDeductionsCount,
    });
  } catch (error) {
    console.error('[Admin Reward Deductions Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reward deductions history.',
      summary: {
        totalGrossRewards: '0.00',
        totalDeductionsCollected: '0.00',
        totalNetRewardsCredited: '0.00',
        totalCount: 0,
        deductionRate: '25%',
      },
      deductions: [],
    });
  }
});

// @route   GET /api/wallet/admin-stats
// @desc    Admin: platform-wide stats computed live from database (users + transactions + deductions)
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

    // Aggregate 25% reward deductions
    const deductionTotals = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          $or: [
            { category: 'prize_reward' },
            { deductionAmount: { $gt: 0 } },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalCut: { $sum: '$deductionAmount' },
          totalGross: { $sum: '$grossReward' },
          totalNet: { $sum: '$netReward' },
          count: { $sum: 1 },
        },
      },
    ]);

    const deductionsSummary = deductionTotals[0] || {
      totalCut: 0,
      totalGross: 0,
      totalNet: 0,
      count: 0,
    };

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
        totalDeductions: Number(deductionsSummary.totalCut || 0).toFixed(2),
        totalGrossRewards: Number(deductionsSummary.totalGross || 0).toFixed(2),
        totalNetRewards: Number(deductionsSummary.totalNet || 0).toFixed(2),
        deductionCount: deductionsSummary.count || 0,
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

