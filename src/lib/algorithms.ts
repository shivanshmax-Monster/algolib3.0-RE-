import { db, ref, get, set, runTransaction, isFirebaseConfigured } from "./firebase";

// ============================================================================
// 2. ALGORITHM INTERFACES & FETCHING (GIST)
// ============================================================================

export interface Algorithm {
  id: string;
  title: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  tags: string[];
  category: string;
  codeJava: string;
  codeCpp: string;
}

const GIST_URL =
  "https://gist.githubusercontent.com/PrateekSingh2/c1016b41398f598bb21891f2b53dabd0/raw/algorithms.json";

const CACHE_KEY = "algolib_algorithms_cache";
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

let cachedAlgorithms: Algorithm[] | null = null;

export async function fetchAlgorithms(): Promise<Algorithm[]> {
  if (cachedAlgorithms) return cachedAlgorithms;

  // Yield to main thread to prevent UI blocking (cursor lag) during heavy operations
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 1. Try to load from localStorage to improve performance
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const { data, timestamp } = JSON.parse(stored);
      if (Date.now() - timestamp < CACHE_DURATION) {
        cachedAlgorithms = data;
        return data;
      }
    }
  } catch (e) {
    console.warn("Failed to load algorithms from cache:", e);
  }

  // 2. Fetch from network
  try {
    const res = await fetch(GIST_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    cachedAlgorithms = data as Algorithm[];
    
    // 3. Update cache (non-blocking)
    setTimeout(() => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: cachedAlgorithms, timestamp: Date.now() }));
    }, 0);
    
    return cachedAlgorithms;
  } catch (error) {
    console.error("Failed to fetch algorithms from Gist:", error);
    
    // Fallback: Try to return stale cache if network fails
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const data = JSON.parse(stored).data;
        cachedAlgorithms = data;
        return data;
      }
    } catch (e) {}
    
    return [];
  }
}

// ============================================================================
// 3. GLOBAL VIEW COUNT LOGIC (FIREBASE REALTIME DATABASE)
// ============================================================================

const DB_PATH = 'site_stats/visits';

/**
 * READ: Fetches the current global visit count from Firebase.
 */
export const getVisitCount = async (): Promise<number> => {
  if (!isFirebaseConfigured || !db) {
    return 0; // Return 0 if Firebase is not configured
  }
  try {
    const countRef = ref(db, DB_PATH);
    const snapshot = await get(countRef);
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return 0; // Default if DB is empty
    }
  } catch (error) {
    console.error("Error reading views from Firebase:", error);
    return 0; // Fallback to 0 on error
  }
};

/**
 * INCREMENT: Atomically increments the view count by 1.
 * Safe for concurrent users.
 */
export const incrementVisitCount = async (): Promise<number> => {
  if (!isFirebaseConfigured || !db) {
    return 0; // Return 0 if Firebase is not configured
  }
  const countRef = ref(db, DB_PATH);
  try {
    const result = await runTransaction(countRef, (currentValue) => {
      return (currentValue || 0) + 1;
    });
    return result.committed ? result.snapshot.val() : 0;
  } catch (error) {
    console.error("Error incrementing views:", error);
    return 0;
  }
};

/**
 * REDUCE: Safely reduces the view count by a specific amount.
 * Ensures the count never drops below zero.
 */
export const reduceVisitCount = async (amount: number): Promise<number> => {
  if (!isFirebaseConfigured || !db) {
    return 0;
  }
  const countRef = ref(db, DB_PATH);
  try {
    const result = await runTransaction(countRef, (currentValue) => {
      const current = currentValue || 0;
      return Math.max(0, current - amount);
    });
    return result.committed ? result.snapshot.val() : 0;
  } catch (error) {
    console.error("Error reducing views:", error);
    return 0;
  }
};

/**
 * SET ABSOLUTE: Force sets the view count to a specific number.
 * Useful for Admin "Database Calibration".
 */
export const setGlobalVisitCount = async (newValue: number): Promise<void> => {
  if (!isFirebaseConfigured || !db) {
    return;
  }
  const countRef = ref(db, DB_PATH);
  await set(countRef, newValue);
};

// Alias for backward compatibility
export const fetchVisitCount = getVisitCount;

// ============================================================================
// 4. HELPER FUNCTIONS
// ============================================================================

export function getCategories(algorithms: Algorithm[]): string[] {
  const cats = new Set<string>();
  algorithms.forEach((a) => {
    if (a.category) cats.add(a.category);
  });
  return Array.from(cats);
}

export function getAllTags(algorithms: Algorithm[]): string[] {
  const tags = new Set<string>();
  algorithms.forEach((a) => a.tags?.forEach((t) => tags.add(t)));
  return Array.from(tags);
}
