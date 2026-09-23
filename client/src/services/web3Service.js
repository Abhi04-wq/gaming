
import { ethers } from 'ethers';
import { BACKEND_URL } from './api';

// Minimal ERC-20 ABI for USDT
export const USDT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export const USDT_ADDRESSES = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet (6 decimals)
  56: '0x55d398326f99059fF775485246999027B3197955', // BNB Smart Chain (18 decimals)
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon (6 decimals)
  11155111: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0', // Sepolia
};

export const SUPPORTED_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    badge: 'Popular',
    iconColor: '#F6851B',
    description: 'Connect with MetaMask browser extension or mobile app.',
    downloadUrl: 'https://metamask.io/download/',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    badge: 'Multi-Chain',
    iconColor: '#0500FF',
    description: 'Connect with Trust Wallet Web3 extension.',
    downloadUrl: 'https://trustwallet.com/browser-extension',
  },
  {
    id: 'safepal',
    name: 'SafePal',
    badge: 'Hardware & Web',
    iconColor: '#7A34EC',
    description: 'Connect with SafePal software or hardware wallet.',
    downloadUrl: 'https://www.safepal.com/download',
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    badge: 'DeFi Native',
    iconColor: '#8697FF',
    description: 'The game-changing wallet for Ethereum & EVM users.',
    downloadUrl: 'https://rabby.io/',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    badge: 'Smart Wallet',
    iconColor: '#0052FF',
    description: 'Connect using Coinbase Wallet extension.',
    downloadUrl: 'https://www.coinbase.com/wallet',
  },
];

/**
 * Check which wallet provider matches the requested wallet.
 * Supports dedicated provider objects like window.safepalProvider,
 * as well as window.ethereum multi-provider arrays without hijacking.
 */
export function detectInjectedProvider(walletName) {
  if (typeof window === 'undefined') {
    return null;
  }

  const eth = window.ethereum;
  const providers = Array.isArray(eth?.providers) ? eth.providers : [];

  // SafePal Wallet:
  // SafePal injects window.safepalProvider as its dedicated EVM provider,
  // or window.safepal?.ethereum, or flags in window.ethereum
  if (walletName === 'SafePal') {
    if (window.safepalProvider) return window.safepalProvider;
    if (window.safepal?.ethereum) return window.safepal.ethereum;
    if (eth?.isSafePal) return eth;
    const safePalInProviders = providers.find((p) => p.isSafePal);
    if (safePalInProviders) return safePalInProviders;
    return null;
  }

  // MetaMask:
  // Must NOT be SafePal, Rabby, Trust, or Coinbase spoofing MetaMask
  if (walletName === 'MetaMask') {
    const metaMaskInProviders = providers.find(
      (p) => p.isMetaMask && !p.isSafePal && !p.isRabby && !p.isTrust && !p.isTrustWallet && !p.isCoinbaseWallet
    );
    if (metaMaskInProviders) return metaMaskInProviders;
    if (eth?.isMetaMask && !eth?.isSafePal && !eth?.isRabby && !eth?.isTrust && !eth?.isCoinbaseWallet) {
      return eth;
    }
    return null;
  }

  // Trust Wallet:
  if (walletName === 'Trust Wallet') {
    if (window.trustwallet?.Provider) return window.trustwallet.Provider;
    if (window.trustwallet) return window.trustwallet;
    if (window.trustWallet) return window.trustWallet;
    const trustInProviders = providers.find((p) => p.isTrust || p.isTrustWallet);
    if (trustInProviders) return trustInProviders;
    if (eth?.isTrust || eth?.isTrustWallet) return eth;
    return null;
  }

  // Rabby Wallet:
  if (walletName === 'Rabby Wallet') {
    if (window.rabby) return window.rabby;
    const rabbyInProviders = providers.find((p) => p.isRabby);
    if (rabbyInProviders) return rabbyInProviders;
    if (eth?.isRabby) return eth;
    return null;
  }

  // Coinbase Wallet:
  if (walletName === 'Coinbase Wallet') {
    if (window.coinbaseWalletExtension) return window.coinbaseWalletExtension;
    const coinbaseInProviders = providers.find((p) => p.isCoinbaseWallet);
    if (coinbaseInProviders) return coinbaseInProviders;
    if (eth?.isCoinbaseWallet) return eth;
    return null;
  }

  // If a specific wallet was requested and not found above,
  // strictly return null so another wallet extension (like SafePal) is never hijacked!
  if (walletName) {
    return null;
  }

  // Generic EVM auto-detect (when no specific walletName is requested):
  // Prefer standard ethereum over safepalProvider
  return eth || window.safepalProvider || null;
}

/**
 * Check if a specific wallet extension is currently installed in the browser
 */
export function isWalletDetected(walletName) {
  return detectInjectedProvider(walletName) !== null;
}

/**
 * Connect to an EVM wallet provider via ethers.js
 */
export async function connectInjectedWallet(walletName) {
  const providerObj = detectInjectedProvider(walletName);

  if (!providerObj) {
    throw new Error(
      `Wallet "${walletName}" extension not detected. Please install it or use Demo Mode to test this wallet.`
    );
  }

  const browserProvider = new ethers.BrowserProvider(providerObj);
  // Request account connection
  await browserProvider.send('eth_requestAccounts', []);

  const signer = await browserProvider.getSigner();
  const address = await signer.getAddress();
  const network = await browserProvider.getNetwork();

  return {
    provider: browserProvider,
    signer,
    address,
    chainId: Number(network.chainId),
    walletType: walletName,
    isDemo: false,
  };
}

/**
 * Creates a Demo/Simulation Wallet for instant testing if the extension isn't installed.
 * Performs REAL cryptographic signing via ethers.js Wallet.
 */
export function createDemoWallet(walletName) {
  // Store or load deterministic demo wallet per walletName so address is consistent
  const storageKey = `demo_wallet_${walletName.toLowerCase().replace(/\s+/g, '_')}`;
  let privateKey = localStorage.getItem(storageKey);

  let wallet;
  if (privateKey) {
    wallet = new ethers.Wallet(privateKey);
  } else {
    wallet = ethers.Wallet.createRandom();
    localStorage.setItem(storageKey, wallet.privateKey);
  }

  return {
    provider: null,
    signer: wallet,
    address: wallet.address,
    chainId: 1,
    walletType: walletName,
    isDemo: true,
  };
}

/**
 * Request cryptographic signature for the nonce challenge
 */
export async function signChallengeMessage(signer, message) {
  if (!signer || typeof signer.signMessage !== 'function') {
    throw new Error('Signer is not available or invalid.');
  }
  const signature = await signer.signMessage(message);
  return signature;
}

/**
 * Fetch live USDT balance directly on client via ethers.js or fallback API
 */
export async function fetchLiveUsdtBalance(address, chainId = 1, browserProvider = null) {
  try {
    const contractAddress = USDT_ADDRESSES[chainId] || USDT_ADDRESSES[1];
    let provider = browserProvider;

    if (!provider) {
      // Use fallback public RPC provider
      const rpcUrl =
        chainId === 56
          ? 'https://binance.llamarpc.com'
          : chainId === 137
          ? 'https://polygon.llamarpc.com'
          : 'https://eth.llamarpc.com';
      provider = new ethers.JsonRpcProvider(rpcUrl);
    }

    const usdtContract = new ethers.Contract(contractAddress, USDT_ABI, provider);
    const [rawBalance, decimals, symbol] = await Promise.all([
      usdtContract.balanceOf(address),
      usdtContract.decimals().catch(() => 6),
      usdtContract.symbol().catch(() => 'USDT'),
    ]);

    const formatted = ethers.formatUnits(rawBalance, decimals);
    const num = parseFloat(formatted);

    return {
      raw: rawBalance.toString(),
      formatted: isNaN(num)
        ? '0.00'
        : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
      symbol,
    };
  } catch (error) {
    console.warn('[Client USDT Fetch Warning]', error.message);
    // If client query is blocked by CORS, query backend proxy
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet/balance?address=${address}&chainId=${chainId}`);
      const data = await res.json();
      if (data.success) {
        return {
          raw: data.raw || '0',
          formatted: data.balance || '0.00',
          symbol: data.symbol || 'USDT',
        };
      }
    } catch (apiErr) {
      console.error('[Backend Balance Proxy Error]', apiErr);
    }

    return {
      raw: '0',
      formatted: '0.00',
      symbol: 'USDT',
    };
  }
}

/**
 * Shorten wallet address for header/cards (e.g. 0x742d...8f44)
 */
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
