

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

// EIP-6963 Provider Storage (Multi-wallet discovery standard)
const announcedProviders = new Map();

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event) => {
    if (event?.detail?.info?.rdns && event?.detail?.provider) {
      announcedProviders.set(event.detail.info.rdns.toLowerCase(), event.detail);
    }
  });
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  } catch (e) { }
}

export function getEip6963Provider(pattern) {
  if (typeof window === 'undefined') return null;

  const pat = pattern.toLowerCase();
  for (const [rdns, detail] of announcedProviders.entries()) {
    const name = (detail.info?.name || '').toLowerCase();
    if (rdns.includes(pat) || name.includes(pat)) {
      return detail.provider;
    }
  }
  return null;
}

/**
 * Check which wallet provider matches the requested wallet.
 * Supports EIP-6963 multi-wallet discovery, dedicated provider objects (SafePal, Trust, Rabby),
 * and window.ethereum multi-provider arrays without hijacking.
 */
export function detectInjectedProvider(walletName) {
  if (typeof window === 'undefined') {
    return null;
  }

  const eth = window.ethereum;
  const providers = Array.isArray(eth?.providers) ? eth.providers : [];

  // SafePal Wallet:
  if (walletName === 'SafePal') {
    const eip = getEip6963Provider('safepal');
    if (eip) return eip;
    if (window.safepalProvider) return window.safepalProvider;
    if (window.safepal?.ethereum) return window.safepal.ethereum;
    if (window.safepal && typeof window.safepal.request === 'function') return window.safepal;
    if (eth?.isSafePal) return eth;
    const safePalInProviders = providers.find((p) => p.isSafePal);
    if (safePalInProviders) return safePalInProviders;
    return null;
  }

  // MetaMask:
  // Must NOT be SafePal, Rabby, Trust, or Coinbase spoofing MetaMask
  if (walletName === 'MetaMask') {
    // 1. Check EIP-6963 (Standard multi-injected provider - bypasses Rabby/SafePal override)
    const eip = getEip6963Provider('metamask');
    if (eip) return eip;

    // 2. Check window.ethereum.providers multi-wallet array
    const metaMaskInProviders = providers.find(
      (p) => p.isMetaMask && !p.isSafePal && !p.isRabby && !p.isTrust && !p.isTrustWallet && !p.isCoinbaseWallet
    );
    if (metaMaskInProviders) return metaMaskInProviders;

    // 3. Check window.ethereum directly if not spoofed
    if (eth?.isMetaMask && !eth?.isSafePal && !eth?.isRabby && !eth?.isTrust && !eth?.isCoinbaseWallet) {
      return eth;
    }

    // 4. Check if window.ethereum has detected providers
    if (eth?.detectedProviders && Array.isArray(eth.detectedProviders)) {
      const dp = eth.detectedProviders.find((p) => p.isMetaMask && !p.isRabby && !p.isSafePal);
      if (dp) return dp;
    }

    return null;
  }

  // Trust Wallet:
  if (walletName === 'Trust Wallet') {
    const eip = getEip6963Provider('trust');
    if (eip) return eip;
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
    const eip = getEip6963Provider('rabby');
    if (eip) return eip;
    if (window.rabby) return window.rabby;
    const rabbyInProviders = providers.find((p) => p.isRabby);
    if (rabbyInProviders) return rabbyInProviders;
    if (eth?.isRabby) return eth;
    return null;
  }

  // Coinbase Wallet:
  if (walletName === 'Coinbase Wallet') {
    const eip = getEip6963Provider('coinbase');
    if (eip) return eip;
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
  return eth || window.safepalProvider || null;
}

/**
 * Check if a specific wallet extension is currently installed in the browser
 */
export function isWalletDetected(walletName) {
  return detectInjectedProvider(walletName) !== null;
}

/**
 * Detect all unique injected wallet providers available in the browser window
 */
export function getAllInjectedProviders() {
  if (typeof window === 'undefined') return [];
  const list = [];
  const seen = new Set();

  function add(name, provider) {
    if (provider && typeof provider.request === 'function' && !seen.has(provider)) {
      seen.add(provider);
      list.push({ name, provider });
    }
  }

  // 0. EIP-6963 announced providers (MetaMask, SafePal, Rabby, Trust, Coinbase)
  for (const [rdns, detail] of announcedProviders.entries()) {
    let n = detail.info?.name || 'Injected Wallet';
    if (rdns.includes('metamask') || n.toLowerCase().includes('metamask')) n = 'MetaMask';
    else if (rdns.includes('safepal') || n.toLowerCase().includes('safepal')) n = 'SafePal';
    else if (rdns.includes('rabby') || n.toLowerCase().includes('rabby')) n = 'Rabby Wallet';
    else if (rdns.includes('trust') || n.toLowerCase().includes('trust')) n = 'Trust Wallet';
    else if (rdns.includes('coinbase') || n.toLowerCase().includes('coinbase')) n = 'Coinbase Wallet';
    add(n, detail.provider);
  }

  // 1. SafePal dedicated
  if (window.safepalProvider) add('SafePal', window.safepalProvider);
  if (window.safepal?.ethereum) add('SafePal', window.safepal.ethereum);
  if (window.safepal && typeof window.safepal.request === 'function') add('SafePal', window.safepal);

  // 2. Trust Wallet dedicated
  if (window.trustwallet?.Provider) add('Trust Wallet', window.trustwallet.Provider);
  if (window.trustwallet && typeof window.trustwallet.request === 'function') add('Trust Wallet', window.trustwallet);
  if (window.trustWallet && typeof window.trustWallet.request === 'function') add('Trust Wallet', window.trustWallet);

  // 3. Rabby dedicated
  if (window.rabby) add('Rabby Wallet', window.rabby);

  // 4. Coinbase dedicated
  if (window.coinbaseWalletExtension) add('Coinbase Wallet', window.coinbaseWalletExtension);

  // 5. Multi-provider array (EIP-5749 / EIP-6963)
  const eth = window.ethereum;
  if (eth) {
    if (Array.isArray(eth.providers)) {
      for (const p of eth.providers) {
        let n = 'Injected Wallet';
        if (p.isSafePal) n = 'SafePal';
        else if (p.isRabby) n = 'Rabby Wallet';
        else if (p.isTrust || p.isTrustWallet) n = 'Trust Wallet';
        else if (p.isCoinbaseWallet) n = 'Coinbase Wallet';
        else if (p.isMetaMask) n = 'MetaMask';
        add(n, p);
      }
    }
    // Also add window.ethereum itself
    let defaultName = 'MetaMask';
    if (eth.isSafePal) defaultName = 'SafePal';
    else if (eth.isRabby) defaultName = 'Rabby Wallet';
    else if (eth.isTrust || eth.isTrustWallet) defaultName = 'Trust Wallet';
    else if (eth.isCoinbaseWallet) defaultName = 'Coinbase Wallet';
    add(defaultName, eth);
  }

  return list;
}

/**
 * Find an active signer that matches targetAddress.
 * 1. Checks all installed extensions silently (eth_accounts - ZERO popups)
 * 2. Checks demo wallets in localStorage
 * 3. If registered walletType is known (e.g. SafePal), requests ONLY that provider
 * 4. NEVER blindly loops or forces MetaMask popup for other wallets!
 */
export async function getSignerForAddress(targetAddress, preferredWalletType = null) {
  const normalized = targetAddress.toLowerCase();
  const allProviders = getAllInjectedProviders();

  let connectedAddresses = [];

  // Step 1: SILENT DISCOVERY across all extensions (ZERO POPUPS)
  // Check which extension currently holds this address without opening any modal
  for (const { name, provider } of allProviders) {
    try {
      const bp = new ethers.BrowserProvider(provider);
      const accounts = await bp.send('eth_accounts', []);
      if (accounts && accounts.length > 0) {
        connectedAddresses.push(...accounts);
        if (accounts.some((a) => a.toLowerCase() === normalized)) {
          try {
            const signer = await bp.getSigner(normalized);
            return { signer, walletType: name, provider: bp };
          } catch (signerErr) {
            console.warn(`[Silent getSigner on ${name} failed]`, signerErr?.message || signerErr);
          }
        }
      }
    } catch (e) {
      // Ignore silent check errors
    }
  }

  // Step 2: Check demo wallets in localStorage
  const demoWallets = ['MetaMask', 'Trust Wallet', 'SafePal', 'Rabby Wallet', 'Coinbase Wallet'];
  for (const w of demoWallets) {
    const dw = createDemoWallet(w);
    if (dw.address.toLowerCase() === normalized) {
      return { signer: dw.signer, walletType: `${w} (Demo)`, provider: null, isDemo: true };
    }
  }

  // Step 3: If target wallet type is specifically registered (e.g. SafePal, Rabby Wallet, Trust Wallet)
  // Connect ONLY to that targeted provider. NEVER fallback to popping up MetaMask!
  if (preferredWalletType) {
    const targetProviderObj = detectInjectedProvider(preferredWalletType);
    if (targetProviderObj) {
      try {
        const bp = new ethers.BrowserProvider(targetProviderObj);
        const accounts = await bp.send('eth_requestAccounts', []);
        if (accounts && accounts.length > 0) {
          connectedAddresses.push(...accounts);
          if (accounts.some((a) => a.toLowerCase() === normalized)) {
            const signer = await bp.getSigner(normalized);
            return { signer, walletType: preferredWalletType, provider: bp };
          }
        }
        return {
          signer: null,
          connectedAddresses,
          walletType: preferredWalletType,
        };
      } catch (err) {
        console.warn(`[Request accounts on ${preferredWalletType} failed]`, err?.message || err);
        return {
          signer: null,
          connectedAddresses,
          walletType: preferredWalletType,
          error: err,
        };
      }
    }
  }

  return { signer: null, connectedAddresses };
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
      usdtContract.symbol().catch(() => 'LXT'),
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
    console.warn('[Client Token Fetch Warning]', error.message);
    // If client query is blocked by CORS, query backend proxy
    try {
      const res = await fetch(`${BACKEND_URL}/api/wallet/balance?address=${address}&chainId=${chainId}`);
      const data = await res.json();
      if (data.success) {
        return {
          raw: data.raw || '0',
          formatted: data.balance || '0.00',
          symbol: data.symbol || 'LXT',
        };
      }
    } catch (apiErr) {
      console.error('[Backend Balance Proxy Error]', apiErr);
    }

    return {
      raw: '0',
      formatted: '0.00',
      symbol: 'LXT',
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
