/**
 * After every deploy the old JavaScript files are gone from the server. A
 * phone that still has the previous version of the site open then fails the
 * moment it navigates somewhere new ("Loading chunk … failed"), and the page
 * looks like it crashed. Those errors are fixed by simply loading the page
 * again, so the error screens do that automatically, once.
 */
const PATTERN = /ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to load chunk/i;
const KEY = "rn-stale-build-reload";

export function isStaleBuildError(error: unknown) {
  if (!error) return false;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return PATTERN.test(text);
}

/** Reloads the page if this looks like a stale build. Returns true when it did. */
export function reloadForStaleBuild(error: unknown) {
  if (typeof window === "undefined" || !isStaleBuildError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    // Never loop: at most one automatic reload every 30 seconds.
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* no storage: still worth one try */
  }
  window.location.reload();
  return true;
}
