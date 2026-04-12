/**
 * Offline data cache using localStorage.
 * Stores tree data, dashboard stats, and profile for offline viewing.
 */

const KEYS = {
  TREE_MEMBERS: "kutumb_cache_members",
  TREE_RELATIONSHIPS: "kutumb_cache_relationships",
  DASHBOARD: "kutumb_cache_dashboard",
  PROFILE: "kutumb_cache_profile",
  TIMESTAMP: "kutumb_cache_timestamp",
};

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Cache tree data (members + relationships) for offline access */
export function cacheTreeData(members: unknown[], relationships: unknown[]) {
  safeSet(KEYS.TREE_MEMBERS, members);
  safeSet(KEYS.TREE_RELATIONSHIPS, relationships);
  safeSet(KEYS.TIMESTAMP, Date.now());
}

/** Retrieve cached tree data */
export function getCachedTreeData(): {
  members: unknown[];
  relationships: unknown[];
  cachedAt: number | null;
} | null {
  const members = safeGet<unknown[]>(KEYS.TREE_MEMBERS);
  const relationships = safeGet<unknown[]>(KEYS.TREE_RELATIONSHIPS);
  if (!members || !relationships) return null;
  return {
    members,
    relationships,
    cachedAt: safeGet<number>(KEYS.TIMESTAMP),
  };
}

/** Cache dashboard stats */
export function cacheDashboardData(data: {
  memberCount: number;
  connectionCount: number;
  inviteCount: number;
  familyMembers: unknown[];
}) {
  safeSet(KEYS.DASHBOARD, data);
  safeSet(KEYS.TIMESTAMP, Date.now());
}

/** Retrieve cached dashboard data */
export function getCachedDashboardData() {
  return safeGet<{
    memberCount: number;
    connectionCount: number;
    inviteCount: number;
    familyMembers: unknown[];
  }>(KEYS.DASHBOARD);
}

/** Cache user profile */
export function cacheProfile(profile: unknown) {
  safeSet(KEYS.PROFILE, profile);
}

/** Retrieve cached profile */
export function getCachedProfile() {
  return safeGet<Record<string, unknown>>(KEYS.PROFILE);
}

/** Check if we have any cached data */
export function hasCachedData(): boolean {
  return !!localStorage.getItem(KEYS.TREE_MEMBERS);
}

/** Get cache age in minutes */
export function getCacheAgeMinutes(): number | null {
  const ts = safeGet<number>(KEYS.TIMESTAMP);
  if (!ts) return null;
  return Math.round((Date.now() - ts) / 60000);
}
