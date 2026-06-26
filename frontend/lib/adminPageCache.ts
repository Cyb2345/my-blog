const pageCache = new Map<string, unknown>();

export function readAdminPageCache<T>(key: string): T | null {
  return (pageCache.get(key) as T | undefined) ?? null;
}

export function writeAdminPageCache<T>(key: string, value: T) {
  pageCache.set(key, value);
}
