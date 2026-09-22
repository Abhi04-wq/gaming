import { getAdminConfigCredentials } from './adminAuthService';
import { GAME_CATALOG } from '../pages/GamesLobby';
import { isFixedThresholdGame } from './adminAuthService';

// Single source of truth: MongoDB via /api/game-config.
// No localStorage — every browser/device sees the same admin values.

const LUDO_IDS = ['ludo-with-friends', 'ludo-dash', 'ludo'];

const POOL_KEYS = [
  'entryPool',
  'prizePool',
  'thresholdScore',
  'ludo2pEntryPool',
  'ludo2pPrizePool',
  'ludo4pEntryPool',
  'ludo4pPrizePool',
  'status',
];

/**
 * GET /api/game-config -> { gameId: config } map.
 * Throws on network/server error so callers can show proper state.
 */
export async function fetchGameConfigs() {
  const res = await fetch('/api/game-config');
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || `Game config fetch failed (status ${res.status})`);
  }
  return data.configs || {};
}

/**
 * Merge server configs into the static catalog (admin list + user lobby).
 * Missing config -> catalog/code defaults.
 */
export function mergeConfigsIntoCatalog(configs = {}) {
  return GAME_CATALOG.map((g) => {
    const ov = configs[g.id] || {};
    return {
      ...g,
      status: ov.status || 'active',
      entryPool: ov.entryPool !== undefined ? String(ov.entryPool) : g.entryPool || '1.00',
      prizePool: ov.prizePool !== undefined ? String(ov.prizePool) : g.prizePool || '100.00',
      ludo2pEntryPool: ov.ludo2pEntryPool !== undefined ? String(ov.ludo2pEntryPool) : g.ludo2pEntryPool || '1.00',
      ludo2pPrizePool: ov.ludo2pPrizePool !== undefined ? String(ov.ludo2pPrizePool) : g.ludo2pPrizePool || '20.00',
      ludo4pEntryPool: ov.ludo4pEntryPool !== undefined ? String(ov.ludo4pEntryPool) : g.ludo4pEntryPool || '2.00',
      ludo4pPrizePool: ov.ludo4pPrizePool !== undefined ? String(ov.ludo4pPrizePool) : g.ludo4pPrizePool || '50.00',
      thresholdScore: isFixedThresholdGame(g.id)
        ? '1'
        : (ov.thresholdScore !== undefined ? String(ov.thresholdScore) : g.thresholdScore || '500'),
    };
  });
}

/** Convenience: pools for one game id (user panel). */
export function getPoolsForGame(configs = {}, gameId) {
  const list = mergeConfigsIntoCatalog(configs);
  return (
    list.find((g) => g.id === gameId) ||
    list.find((g) => gameId?.includes('ludo') && g.id === 'ludo-with-friends') ||
    null
  );
}

function cleanPayload(config) {
  const payload = {};
  POOL_KEYS.forEach((k) => {
    if (config[k] !== undefined && config[k] !== null) payload[k] = String(config[k]);
  });
  return payload;
}

/**
 * Save one game's pools to server (admin only).
 * Ludo ids fan out so all aliases stay in sync.
 */
export async function saveGameConfig(gameId, config) {
  const creds = getAdminConfigCredentials();
  const ids = gameId && gameId.includes('ludo') ? LUDO_IDS : [gameId];
  const payload = cleanPayload(config);

  const results = [];
  for (const id of ids) {
    const res = await fetch(`/api/game-config/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': creds.email,
        'x-admin-password': creds.password,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || `Server save failed for ${id} (status ${res.status})`);
    }
    results.push(data.config);
  }
  return results;
}

// Back-compat aliases (old localStorage-era names)
export const syncGameConfigsFromServer = fetchGameConfigs;
export const pushGameConfigToServer = saveGameConfig;
