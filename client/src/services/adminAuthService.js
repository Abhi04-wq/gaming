// Admin Authentication Service with Static Credentials & Session Management
// NOTE: Game pools live ONLY in MongoDB via gameConfigService (/api/game-config).
// No localStorage overrides — every browser/device sees identical admin values.

export const getAdminConfigCredentials = () => ({
  email: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@loyaltygame.com').trim(),
  password: (import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@12345').trim(),
  role: 'super_admin',
  name: 'Platform Administrator',
});

const TOKEN_KEY = 'loyalty_admin_token';
const USER_KEY = 'loyalty_admin_user';

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
    // Generate a deterministic pseudo-token for the session
    const sessionToken = 'admin_jwt_' + btoa(`${trimmedEmail}:${Date.now()}`);
    const adminUser = {
      email: adminCredentials.email,
      role: adminCredentials.role,
      name: adminCredentials.name,
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem(TOKEN_KEY, sessionToken);
    localStorage.setItem(USER_KEY, JSON.stringify(adminUser));

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
 * Check if the admin is currently authenticated
 */
export function isAdminAuthenticated() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = localStorage.getItem(USER_KEY);
  return Boolean(token && user);
}

/**
 * Get active admin session user info
 */
export function getAdminSession() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear admin session
 */
export function logoutAdmin() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
