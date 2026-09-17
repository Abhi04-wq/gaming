const BASE_URL = '/api';

/**
 * Standard fetch wrapper with auth header & JSON parsing
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('web3_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Check if wallet already exists
  checkWallet: (walletAddress) =>
    request('/auth/check-wallet', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    }),

  // Get single-use nonce challenge
  getNonce: (walletAddress, action = 'auth') =>
    request('/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress, action }),
    }),

  // Complete registration
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Complete login
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Get current user profile
  getMe: () => request('/auth/me'),

  // Fetch USDT balance
  getBalance: (address, chainId = 1) =>
    request(`/wallet/balance?address=${address}&chainId=${chainId}`),

  // Deduct game entry pool fee
  deductGameEntry: (address, gameId, amount, gameTitle = null) =>
    request('/wallet/deduct-entry', {
      method: 'POST',
      body: JSON.stringify({ address, gameId, gameTitle, amount }),
    }),

  // Credit prize pool reward when player score reaches threshold
  creditPrizeReward: (payload) =>
    request('/wallet/credit-prize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Fetch user income details (credits, debits, summary, and transaction history)
  getIncomeDetails: (address, type = null) => {
    const typeQuery = type ? `&type=${type}` : '';
    return request(`/wallet/income-details?address=${encodeURIComponent(address)}${typeQuery}`);
  },

  // Deposit USDT funds into wallet
  depositFunds: (address, amount, description = null) =>
    request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ address, amount, description }),
    }),

  // Admin: fetch ALL users income history (every credit + debit in DB)
  getAllTransactions: ({ type = null, search = '', limit = 200 } = {}) => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (search) params.set('search', search);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return request(`/wallet/all-transactions${qs ? `?${qs}` : ''}`);
  },

  // Admin: platform-wide stats live from database (users + transactions)
  getAdminStats: () => request('/wallet/admin-stats'),

  // Logout
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
};
