// Admin Authentication Service with Static Credentials & Session Management
import { GAME_CATALOG } from '../pages/GamesLobby';

export const getAdminConfigCredentials = () => ({
  email: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@loyaltygame.com').trim(),
  password: (import.meta.env.VITE_ADMIN_PASSWORD || 'Admin@12345').trim(),
  role: 'super_admin',
  name: 'Platform Administrator',
});

const TOKEN_KEY = 'loyalty_admin_token';
const USER_KEY = 'loyalty_admin_user';
const GAME_OVERRIDES_KEY = 'loyalty_admin_game_overrides';

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
 * Retrieve all games including any admin status overrides or newly added games
 */
export function getAdminGamesList() {
  try {
    const savedOverrides = localStorage.getItem(GAME_OVERRIDES_KEY);
    const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};

    // Merge baseline GAME_CATALOG with any stored overrides or additions
    const baseGames = GAME_CATALOG.map((g) => ({
      ...g,
      status: overrides[g.id]?.status || 'active',
      customNotes: overrides[g.id]?.customNotes || '',
      entryPool: overrides[g.id]?.entryPool !== undefined ? overrides[g.id].entryPool : (g.entryPool || '1.00'),
      prizePool: overrides[g.id]?.prizePool !== undefined ? overrides[g.id].prizePool : (g.prizePool || '100.00'),
      thresholdScore: overrides[g.id]?.thresholdScore !== undefined ? overrides[g.id].thresholdScore : (g.thresholdScore || '500'),
    }));

    // Add any completely new games added by admin
    const newGames = (overrides.__newGames || []).map((g) => ({
      ...g,
      entryPool: overrides[g.id]?.entryPool !== undefined ? overrides[g.id].entryPool : (g.entryPool || '1.00'),
      prizePool: overrides[g.id]?.prizePool !== undefined ? overrides[g.id].prizePool : (g.prizePool || '100.00'),
      thresholdScore: overrides[g.id]?.thresholdScore !== undefined ? overrides[g.id].thresholdScore : (g.thresholdScore || '500'),
    }));
    return [...baseGames, ...newGames];
  } catch (err) {
    console.error('[Admin Games Load Error]', err);
    return GAME_CATALOG.map((g) => ({
      ...g,
      status: 'active',
      entryPool: g.entryPool || '1.00',
      prizePool: g.prizePool || '100.00',
      thresholdScore: g.thresholdScore || '500',
    }));
  }
}

/**
 * Update game configuration (entry pool, prize pool, threshold score)
 */
export function updateGameConfig(gameId, configData) {
  try {
    const savedOverrides = localStorage.getItem(GAME_OVERRIDES_KEY);
    const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};

    overrides[gameId] = {
      ...(overrides[gameId] || {}),
      entryPool: String(configData.entryPool || '1.00'),
      prizePool: String(configData.prizePool || '100.00'),
      thresholdScore: String(configData.thresholdScore || '500'),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(GAME_OVERRIDES_KEY, JSON.stringify(overrides));
    return overrides[gameId];
  } catch (err) {
    console.error('[Update Game Config Error]', err);
    throw err;
  }
}

/**
 * Toggle a game's active/paused status
 */
export function toggleGameStatus(gameId) {
  try {
    const savedOverrides = localStorage.getItem(GAME_OVERRIDES_KEY);
    const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};

    const currentStatus = overrides[gameId]?.status || 'active';
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    overrides[gameId] = {
      ...(overrides[gameId] || {}),
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(GAME_OVERRIDES_KEY, JSON.stringify(overrides));
    return newStatus;
  } catch (err) {
    console.error('[Toggle Game Status Error]', err);
    return 'active';
  }
}

/**
 * Add a new custom game to the catalog
 */
export function addAdminGame(gameData) {
  try {
    const savedOverrides = localStorage.getItem(GAME_OVERRIDES_KEY);
    const overrides = savedOverrides ? JSON.parse(savedOverrides) : {};
    const newGames = overrides.__newGames || [];

    const id = gameData.id || `custom-${Date.now()}`;
    const newGameEntry = {
      ...gameData,
      id,
      status: 'active',
      addedAt: new Date().toISOString(),
      coverUrl: gameData.coverUrl || `https://static.gamezop.com/${gameData.gzCode}/wall.png`,
      logoUrl: gameData.logoUrl || `https://static.gamezop.com/${gameData.gzCode}/square.png`,
      embedUrl: `https://gamescdn.gamezop.com/_game-files/${gameData.gzCode}/index.html`,
      directUrl: `https://gamescdn.gamezop.com/_game-files/${gameData.gzCode}/index.html`,
      screenshots: [
        { title: `${gameData.title} Gameplay`, url: `https://static.gamezop.com/${gameData.gzCode}/wall.png` },
      ],
    };

    newGames.push(newGameEntry);
    overrides.__newGames = newGames;
    localStorage.setItem(GAME_OVERRIDES_KEY, JSON.stringify(overrides));
    return newGameEntry;
  } catch (err) {
    console.error('[Add Game Error]', err);
    throw err;
  }
}
