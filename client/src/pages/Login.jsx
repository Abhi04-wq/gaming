import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import {
  detectInjectedProvider,
  createDemoWallet,
  signChallengeMessage,
  fetchLiveUsdtBalance,
  shortenAddress,
} from '../services/web3Service';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import {
  KeyRound,
  Sparkles,
  AlertCircle,
  ArrowRight,
  UserPlus,
  Loader2,
  CheckCircle2,
  Wallet,
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();

  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [authStep, setAuthStep] = useState(null); // 'checking' | 'connecting' | 'signing' | 'verifying'
  const [errorMessage, setErrorMessage] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Pre-fill address if passed in query param
  useEffect(() => {
    const addressParam = searchParams.get('address');
    if (addressParam && ethers.isAddress(addressParam)) {
      setWalletAddress(addressParam);
    }
  }, [searchParams]);

  // Shortcut: Auto-fill from connected browser wallet
  const handleAutoDetectWallet = async () => {
    try {
      const injectedProvider = detectInjectedProvider();
      if (!injectedProvider) {
        setToastMessage({
          text: 'No injected Web3 wallet found in browser. Please open your wallet extension or enter an address.',
          type: 'info',
        });
        return;
      }
      const provider = new ethers.BrowserProvider(injectedProvider);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts && accounts[0]) {
        setWalletAddress(accounts[0]);
        setToastMessage({
          text: `Address detected: ${shortenAddress(accounts[0])}`,
          type: 'success',
        });
      }
    } catch (err) {
      console.warn('[Auto Detect Error]', err);
      setToastMessage({
        text: 'Failed to read wallet address from extension.',
        type: 'error',
      });
    }
  };

  // Direct 1-Click Login with a specific wallet (e.g. SafePal)
  const handleQuickWalletLogin = async (walletName) => {
    setErrorMessage('');
    setNotRegistered(false);
    setLoading(true);
    setAuthStep('connecting');

    try {
      const connection = await connectInjectedWallet(walletName);
      const { address, signer } = connection;
      const normalizedAddress = address.toLowerCase();
      setWalletAddress(normalizedAddress);

      // Check registration status
      setAuthStep('checking');
      const checkRes = await api.checkWallet(normalizedAddress);
      if (!checkRes.exists) {
        setNotRegistered(true);
        setErrorMessage(`Wallet ${shortenAddress(normalizedAddress)} is not registered yet.`);
        setLoading(false);
        setAuthStep(null);
        return;
      }

      // Request login nonce challenge
      setAuthStep('connecting');
      const nonceRes = await api.getNonce(normalizedAddress, 'login');
      if (!nonceRes.success || !nonceRes.nonce) {
        throw new Error('Failed to generate secure authentication challenge.');
      }

      // Cryptographic signature
      setAuthStep('signing');
      const signature = await signChallengeMessage(signer, nonceRes.message);

      // Backend verification
      setAuthStep('verifying');
      const loginRes = await api.login({
        walletAddress: normalizedAddress,
        signature,
        nonce: nonceRes.nonce,
      });

      if (!loginRes.success) {
        throw new Error(loginRes.message || 'Login signature verification failed.');
      }

      loginUser(loginRes.token, loginRes.user, signer);
      setToastMessage({
        text: `Welcome back! Authenticated with ${walletName}.`,
        type: 'success',
      });

      setTimeout(() => {
        navigate('/games');
      }, 900);
    } catch (err) {
      console.error('[Quick Wallet Login Error]', err);
      if (err.code === 4001 || err.message?.includes('reject') || err.message?.includes('denied')) {
        setErrorMessage('Connection or signature request cancelled.');
      } else {
        setErrorMessage(err.message || 'Failed to connect and sign in with wallet.');
      }
      setToastMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
      setAuthStep(null);
    }
  };

  // Main Login Workflow
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage('');
    setNotRegistered(false);

    // Validate EVM address
    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress || !ethers.isAddress(trimmedAddress)) {
      setErrorMessage('Please enter a valid EVM wallet address (e.g. 0x...).');
      return;
    }

    const normalizedAddress = trimmedAddress.toLowerCase();
    setLoading(true);

    try {
      // Step 1: Check MongoDB if wallet account exists
      setAuthStep('checking');
      const checkRes = await api.checkWallet(normalizedAddress);

      if (!checkRes.exists) {
        setNotRegistered(true);
        setErrorMessage('Wallet not registered.');
        setLoading(false);
        setAuthStep(null);
        return;
      }

      // Step 2: Request fresh single-use nonce challenge from backend
      setAuthStep('connecting');
      const nonceRes = await api.getNonce(normalizedAddress, 'login');
      if (!nonceRes.success || !nonceRes.nonce) {
        throw new Error('Failed to generate secure authentication challenge.');
      }

      // Step 3: Connect to wallet signer (Injected or Demo)
      let signer;
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          await browserProvider.send('eth_requestAccounts', []);
          const browserSigner = await browserProvider.getSigner();
          const signerAddr = await browserSigner.getAddress();

          if (signerAddr.toLowerCase() === normalizedAddress) {
            signer = browserSigner;
          }
        } catch (injectedErr) {
          console.warn('[Injected Signer Match Failed]', injectedErr);
        }
      }

      // If address belongs to demo wallet or extension not available for this address, use demo wallet
      if (!signer) {
        // Look in localStorage for demo keys
        const wallets = ['MetaMask', 'Trust Wallet', 'SafePal', 'Rabby Wallet', 'Coinbase Wallet'];
        for (const w of wallets) {
          const dw = createDemoWallet(w);
          if (dw.address.toLowerCase() === normalizedAddress) {
            signer = dw.signer;
            break;
          }
        }
      }

      // Fallback: If no signer yet matches this address
      if (!signer) {
        if (typeof window !== 'undefined' && window.ethereum) {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          signer = await browserProvider.getSigner();
        } else {
          // Fallback simulation signer
          const dw = createDemoWallet('MetaMask');
          signer = dw.signer;
        }
      }

      // Step 4: Sign nonce message with wallet
      setAuthStep('signing');
      let signature;
      try {
        signature = await signChallengeMessage(signer, nonceRes.message);
      } catch (sigErr) {
        if (sigErr.code === 4001 || sigErr.message?.includes('reject') || sigErr.message?.includes('denied')) {
          throw new Error('Signature rejected. Authentication was cancelled.');
        }
        throw new Error(`Signature failed: ${sigErr.message || 'Signature request cancelled.'}`);
      }

      // Step 5: Verify signature on backend & obtain JWT
      setAuthStep('verifying');
      const loginRes = await api.login({
        walletAddress: normalizedAddress,
        signature,
        nonce: nonceRes.nonce,
      });

      if (!loginRes.success) {
        throw new Error(loginRes.message || 'Login signature verification failed.');
      }

      // Step 6: Store JWT & redirect to /dashboard
      loginUser(loginRes.token, loginRes.user, signer);

      setToastMessage({
        text: 'Authenticated successfully! Welcome back.',
        type: 'success',
      });

      setTimeout(() => {
        navigate('/games');
      }, 900);
    } catch (error) {
      console.error('[Login Error]', error);
      setErrorMessage(error.message || 'An error occurred during wallet login.');
      setToastMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
      setAuthStep(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 75px)',
        padding: '30px 20px',
        position: 'relative',
        zIndex: 2,
      }}
    >
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

      {/* Main Login Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '36px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 230, 118, 0.10)',
              border: '1px solid rgba(0, 230, 118, 0.25)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              color: '#00E676',
              marginBottom: '14px',
              fontWeight: 600,
            }}
          >
            <KeyRound size={14} color="#00E676" />
            <span>Cryptographic Sign-In</span>
          </div>

          <h1 style={{ fontSize: '1.85rem', marginBottom: '8px', color: '#FFFFFF' }}>Welcome Back</h1>
          <p style={{ color: '#A3A3A3', fontSize: '0.95rem' }}>
            Enter your wallet address to continue.
          </p>
        </div>

        {/* Not Registered State */}
        {notRegistered ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ color: '#ffffff', fontSize: '1.1rem', marginBottom: '6px' }}>
              Wallet Not Registered
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginBottom: '20px' }}>
              This wallet address doesn't have an active account yet. Would you like to create one now?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link
                to={`/register`}
                className="btn-primary"
                style={{ width: '100%', textDecoration: 'none' }}
              >
                <UserPlus size={16} />
                <span>Create Account</span>
              </Link>

              <button
                onClick={() => {
                  setNotRegistered(false);
                  setErrorMessage('');
                  setWalletAddress('');
                }}
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                Try Another Address
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#f87171',
                  fontSize: '0.88rem',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Auth Step Feedback */}
            {authStep && (
              <div
                style={{
                  background: 'rgba(0, 230, 118, 0.10)',
                  border: '1px solid rgba(0, 230, 118, 0.3)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#00E676',
                  fontSize: '0.88rem',
                }}
              >
                <Sparkles size={18} color="#00E676" />
                <span>
                  {authStep === 'checking' && 'Checking wallet address in MongoDB...'}
                  {authStep === 'connecting' && 'Requesting signature challenge...'}
                  {authStep === 'signing' && 'Please confirm the signature in your wallet...'}
                  {authStep === 'verifying' && 'Verifying cryptographic signature on backend...'}
                </span>
              </div>
            )}

            {/* Wallet Address Input */}
            <div className="input-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label">Wallet Address</label>
                <button
                  type="button"
                  onClick={handleAutoDetectWallet}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00E676',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                >
                  <Wallet size={12} />
                  <span>Use Connected Wallet</span>
                </button>
              </div>

              <input
                type="text"
                className="web3-input"
                placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !walletAddress.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #242424',
            marginTop: '28px',
            paddingTop: '20px',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#A3A3A3',
          }}
        >
          <span>Need a new Web3 account? </span>
          <Link
            to="/register"
            style={{
              color: '#00E676',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            onMouseOver={(e) => (e.target.style.color = '#39FF88')}
            onMouseOut={(e) => (e.target.style.color = '#00E676')}
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
