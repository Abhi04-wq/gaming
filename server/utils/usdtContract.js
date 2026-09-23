const { ethers } = require('ethers');

// Minimal ERC-20 ABI for USDT
const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const USDT_ADDRESSES = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet (6 decimals)
  56: '0x55d398326f99059fF775485246999027B3197955', // BNB Smart Chain (18 decimals)
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon (6 decimals)
  11155111: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia testnet mock USDT
};

const RPC_ENDPOINTS = {
  1: process.env.RPC_URL || 'https://cloudflare-eth.com',
  56: 'https://binance.llamarpc.com',
  137: 'https://polygon-rpc.com',
  11155111: 'https://rpc.sepolia.org',
};

/**
 * Fetches the live USDT balance of an EVM wallet address
 * @param {string} walletAddress
 * @param {number} chainId
 * @returns {Promise<{ raw: string, formatted: string, symbol: string }>}
 */
async function getUsdtBalanceFromRpc(walletAddress, chainId = 1) {
  try {
    const rpcUrl = RPC_ENDPOINTS[chainId] || RPC_ENDPOINTS[1];
    const contractAddress = USDT_ADDRESSES[chainId] || USDT_ADDRESSES[1];

    // Use staticNetwork to prevent ethers from polling eth_chainId endlessly if RPC is unreachable
    const staticNet = ethers.Network.from(chainId || 1);
    const fetchReq = new ethers.FetchRequest(rpcUrl);
    fetchReq.timeout = 5000;

    const provider = new ethers.JsonRpcProvider(fetchReq, staticNet, { staticNetwork: staticNet });
    const contract = new ethers.Contract(contractAddress, USDT_ABI, provider);

    // Fetch token decimals and balance with timeout
    const [rawBalance, decimals, symbol] = await Promise.all([
      contract.balanceOf(walletAddress).catch(() => 0n),
      contract.decimals().catch(() => 6),
      contract.symbol().catch(() => 'LXT'),
    ]);

    const formatted = ethers.formatUnits(rawBalance, decimals);
    const num = parseFloat(formatted);
    const displayBalance = isNaN(num)
      ? '0.00'
      : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

    return {
      raw: rawBalance.toString(),
      formatted: displayBalance,
      symbol,
    };
  } catch (error) {
    console.warn(`[Token RPC Fetch Warning] ${error.message}. Returning default format.`);
    return {
      raw: '0',
      formatted: '0.00',
      symbol: 'LXT',
    };
  }
}

module.exports = {
  USDT_ABI,
  USDT_ADDRESSES,
  getUsdtBalanceFromRpc,
};
