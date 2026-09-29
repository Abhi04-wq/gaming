// Admin Authentication Service with Static Credentials & Session Management
// NOTE: Game pools live ONLY in MongoDB via gameConfigService (/api/game-config).
// No localStorage overrides — every browser/device sees identical admin values.

export const getAdminConfigCredentials = () => ({
  email: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@loyaltygame.com').trim(),
  password: (import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@12345').trim(),
  role: 'super_admin',
  name: 'Platform Administrator',
});

const TOKEN_KEY = 'loyalty_admin_session_token';
const USER_KEY = 'loyalty_admin_session_user';
const EXPIRES_KEY = 'loyalty_admin_session_expires';

// Immediately clear any legacy permanent localStorage tokens from older versions
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('loyalty_admin_token');
    localStorage.removeItem('loyalty_admin_user');
  }
} catch (_) {}

/**
 * Authenticate with configured admin credentials
 */
export async function loginAdmin(email, password) {
  // Simulate asynchronous secure verification
  await new Promise((resolve) => setTimeout(resolve, 400));

  const adminCredentials = getAdminConfigCredentials();
  const trimmedEmail = (email || '').trim().toLowerCase();
  const trimmedPassword = (password || '').trim();

  if (
    trimmedEmail === adminCredentials.email.toLowerCase() &&
    trimmedPassword === adminCredentials.password
  ) {
    const sessionToken = 'admin_session_' + btoa(`${trimmedEmail}:${Date.now()}`);
    const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 hours active session
    const adminUser = {
      email: adminCredentials.email,
      role: adminCredentials.role,
      name: adminCredentials.name,
      loggedInAt: new Date().toISOString(),
      expiresAt,
    };

    sessionStorage.setItem(TOKEN_KEY, sessionToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(adminUser));
    sessionStorage.setItem(EXPIRES_KEY, String(expiresAt));

    return {
      success: true,
      token: sessionToken,
      user: adminUser,
    };
  }

  return {
    success: false,
    message: 'Invalid email or password.',
  };
}

/**
 * Check if the admin is currently authenticated in this browser session
 */
export function isAdminAuthenticated() {
  if (typeof window === 'undefined') return false;

  const token = sessionStorage.getItem(TOKEN_KEY);
  const user = sessionStorage.getItem(USER_KEY);
  const expiresAt = sessionStorage.getItem(EXPIRES_KEY);

  if (!token || !user) {
    return false;
  }

  // Check if session has expired
  if (expiresAt && Date.now() > Number(expiresAt)) {
    logoutAdmin();
    return false;
  }

  return true;
}

/**
 * Get active admin session user info
 */
export function getAdminSession() {
  if (typeof window === 'undefined') return null;
  try {
    if (!isAdminAuthenticated()) return null;
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear admin session
 */
export function logoutAdmin() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
  try {
    localStorage.removeItem('loyalty_admin_token');
    localStorage.removeItem('loyalty_admin_user');
  } catch (_) {}
}

/**
 * Games with permanently fixed threshold score of 1 (Carrom & Chess)
 */
export const isFixedThresholdGame = (gameId) => {
  if (!gameId) return false;
  const id = String(gameId).toLowerCase();
  return id === 'carrom-hero' || id === 'carrom' || id === 'chess-grandmaster' || id === 'chess';
};

// NOTE: getAdminGamesList / updateGameConfig / toggleGameStatus / addAdminGame
// were removed — game pools live ONLY in MongoDB (see gameConfigService).
// Importing them will throw so stale localStorage code paths fail loudly.
function removed(name) {
  throw new Error(
    `[${name}] removed: game config is database-only now (use gameConfigService).`
  );
}

export function getAdminGamesList() {
  removed('getAdminGamesList');
}

export function updateGameConfig() {
  removed('updateGameConfig');
}

export function toggleGameStatus() {
  removed('toggleGameStatus');
}

export function addAdminGame() {
  removed('addAdminGame');
}
