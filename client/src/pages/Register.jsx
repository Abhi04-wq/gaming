import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { useAuth } from '../context/AuthContext';
import {
  detectInjectedProvider,
  connectInjectedWallet,
  isWalletDetected,
  signChallengeMessage,
  fetchLiveUsdtBalance,
  shortenAddress,
} from '../services/web3Service';
import { api } from '../services/api';
import WalletCard from '../components/WalletCard';
import Toast from '../components/Toast';
import {
  Shield,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const SUPPORTED_WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    badge: 'Popular',
    description: 'The world’s most trusted Web3 crypto wallet extension and mobile app.',
  },
  {
    id: 'trustwallet',
    name: 'Trust Wallet',
    badge: 'Multi-Chain',
    description: 'Secure self-custody wallet supporting Ethereum, BNB Chain, and Polygon.',
  },
  {
    id: 'safepal',
    name: 'SafePal',
    badge: 'Hardware & App',
    description: 'Next-generation crypto suite with hardware security & Binance ecosystem integration.',
  },
  {
    id: 'rabby',
    name: 'Rabby Wallet',
    badge: 'DeFi Pro',
    description: 'The game-changing browser wallet built specifically for Ethereum & EVM chains.',
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    badge: 'Self-Custody',
    description: 'Your passport to the decentralized web from one of the largest crypto platforms.',
  },
];

export default function Register() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [connectingWallet, setConnectingWallet] = useState(null);
  const [authStep, setAuthStep] = useState(null); // 'connecting' | 'signing' | 'registering' | 'done'
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadyRegisteredAddress, setAlreadyRegisteredAddress] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [detectedWallets, setDetectedWallets] = useState({});

  // Dynamically listen for EIP-6963 provider announcements (e.g. MetaMask, SafePal)
  useEffect(() => {
    let mounted = true;
    const checkWallets = () => {
      if (!mounted) return;
      const detected = {};
      for (const w of SUPPORTED_WALLETS) {
        detected[w.name] = isWalletDetected(w.name);
      }
      setDetectedWallets(detected);
    };

    checkWallets();

    const onAnnounce = () => {
      setTimeout(checkWallets, 50);
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    try {
      window.dispatchEvent(new Event('eip6963:requestProvider'));
    } catch (e) {}

    const timer = setTimeout(checkWallets, 300);
    return () => {
      mounted = false;
      window.removeEventListener('eip6963:announceProvider', onAnnounce);
      clearTimeout(timer);
    };
  }, []);

  const handleConnectAndRegister = async (walletName) => {
    setConnectingWallet(walletName);
    setErrorMessage('');
    setAlreadyRegisteredAddress(null);

    try {
      // Browser Extension Connection
      setAuthStep('connecting');
      const connection = await connectInjectedWallet(walletName);
      const signer = connection.signer;
      const address = connection.address.toLowerCase();
      const chainId = connection.chainId;

      // Step 2: Check if this wallet is already registered in MongoDB
      const checkRes = await api.checkWallet(address);
      if (checkRes.exists) {
        setAlreadyRegisteredAddress(address);
        setErrorMessage(`Wallet address ${shortenAddress(address)} is already registered. Please login instead.`);
        setConnectingWallet(null);
        setAuthStep(null);
        return;
      }

      // Step 4: Request cryptographically unique single-use nonce from server
      setAuthStep('signing');
      const nonceRes = await api.getNonce(address, 'register');
      if (!nonceRes.success || !nonceRes.nonce) {
        throw new Error('Could not obtain authentication nonce challenge from server.');
      }

      // Step 5: Cryptographically sign the message with the wallet
      let signature;
      try {
        signature = await signChallengeMessage(signer, nonceRes.message);
      } catch (sigErr) {
        if (sigErr.code === 4001 || sigErr.message?.includes('reject') || sigErr.message?.includes('denied')) {
          throw new Error('Signature rejected. Authentication was cancelled.');
        }
        throw new Error(`Signature failed: ${sigErr.message || 'Signature request cancelled.'}`);
      }

      // Step 6: Send signature, nonce, and details to Express backend with 50 starting tokens
      setAuthStep('registering');
      const registerRes = await api.register({
        walletAddress: address,
        signature,
        nonce: nonceRes.nonce,
        walletType: walletName,
        chainId,
        usdtBalance: '50.00',
      });

      if (!registerRes.success) {
        throw new Error(registerRes.message || 'Registration failed.');
      }

      // Step 7: Store JWT and session, then redirect to /games
      setAuthStep('done');
      loginUser(registerRes.token, registerRes.user, signer);

      setToastMessage({
        text: 'Wallet connected successfully! 50 LXT welcome tokens credited.',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/games');
      }, 900);
    } catch (error) {
      console.error('[Registration Error]', error);
      setErrorMessage(error.message || 'An unexpected error occurred during registration.');
      setToastMessage({ text: error.message, type: 'error' });
    } finally {
      setConnectingWallet(null);
      setAuthStep(null);
    }
  };

  return (
    <div className="auth-container register-container">
      {/* Toast */}
      {toastMessage && (
        <div className="toast-container">
          <Toast
            message={toastMessage.text}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Main Registration Card */}
      <div className="glass-panel auth-card register-card">
        {/* Header */}
        <div className="register-header">
          <div className="register-badge-pill">
            <Shield size={14} color="#00E676" />
            <span>Cryptographic Web3 Identity</span>
          </div>

          <h1 className="register-title">Create Your Web3 Account</h1>
          <p className="register-subtitle">
            Connect your wallet to create your account securely.
          </p>
        </div>

        {/* Existing Wallet Alert */}
        {alreadyRegisteredAddress && (
          <div className="already-registered-alert">
            <div className="already-registered-info">
              <AlertCircle size={20} color="#FFB800" className="alert-icon-shrink" />
              <div>
                <p className="already-registered-title">
                  This wallet is already registered.
                </p>
                <p className="already-registered-addr">
                  {shortenAddress(alreadyRegisteredAddress)}
                </p>
              </div>
            </div>
            <Link
              to={`/login?address=${alreadyRegisteredAddress}`}
              className="btn-primary already-registered-login-btn"
            >
              <span>Login</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && !alreadyRegisteredAddress && (
          <div className="register-error-banner">
            <AlertCircle size={18} className="alert-icon-shrink" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Step Status Banner */}
        {authStep && (
          <div className="register-auth-step-banner">
            <Sparkles size={18} color="#00E676" className="alert-icon-shrink" />
            <span>
              {authStep === 'connecting' && 'Connecting to wallet provider...'}
              {authStep === 'signing' && 'Please confirm the signature request in your wallet.'}
              {authStep === 'registering' && 'Verifying cryptographic signature on backend...'}
              {authStep === 'done' && 'Account verified! Opening games...'}
            </span>
          </div>
        )}

        {/* 5 Wallet Selection Cards */}
        <div className="wallet-grid">
          {SUPPORTED_WALLETS.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              isConnecting={connectingWallet === wallet.name}
              isDetected={Boolean(detectedWallets[wallet.name])}
              onConnect={() => handleConnectAndRegister(wallet.name)}
            />
          ))}
        </div>

        {/* Card Footer: Already have an account? */}
        <div className="register-footer-link">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
