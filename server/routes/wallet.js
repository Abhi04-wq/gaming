const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { getUsdtBalanceFromRpc } = require('../utils/usdtContract');
const User = require('../models/User');

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
    const balanceData = await getUsdtBalanceFromRpc(normalizedAddress, Number(chainId));

    // Opportunistically update cached balance in DB if user exists
    await User.updateOne(
      { walletAddress: normalizedAddress },
      { $set: { usdtBalance: balanceData.formatted, chainId: Number(chainId) } }
    ).catch(() => {});

    return res.json({
      success: true,
      walletAddress: normalizedAddress,
      balance: balanceData.formatted,
      symbol: balanceData.symbol,
      raw: balanceData.raw,
      chainId: Number(chainId),
    });
  } catch (error) {
    console.error('[Wallet Balance Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch USDT balance from blockchain.',
      balance: '0.00',
      symbol: 'USDT',
    });
  }
});

module.exports = router;
