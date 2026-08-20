const STORAGE_PREFIX = 'proleaguestats:';

function buildKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(buildKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(buildKey(key), JSON.stringify(value));
}

function removeItem(key: string): void {
  localStorage.removeItem(buildKey(key));
}

function hasItem(key: string): boolean {
  return localStorage.getItem(buildKey(key)) !== null;
}

function clearAll(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

function getCollection<T>(key: string, seed: T[]): T[] {
  if (!hasItem(key)) {
    setItem(key, seed);
    return seed;
  }
  return getItem<T[]>(key, seed);
}

export const storageService = {
  getItem,
  setItem,
  removeItem,
  hasItem,
  clearAll,
  getCollection,
};
