import { AnimeItem } from "./api";

// ============ Watch Progress (Continue Watching) ============
export interface WatchProgress {
  animeName: string;
  episode: number;
  timestamp: number; // seconds into the episode
  duration: number;
  cover?: string;
  title?: string;
  updatedAt: number;
}

const PROGRESS_KEY = "beat-anistream-progress";
const WATCHLIST_KEY = "beat-anistream-watchlist";

export function getWatchProgress(): WatchProgress[] {
  try {
    const data = localStorage.getItem(PROGRESS_KEY);
    if (!data) return [];
    return JSON.parse(data).sort((a: WatchProgress, b: WatchProgress) => b.updatedAt - a.updatedAt);
  } catch { return []; }
}

export function saveWatchProgress(progress: WatchProgress) {
  const all = getWatchProgress().filter(
    p => !(p.animeName === progress.animeName && p.episode === progress.episode)
  );
  all.unshift({ ...progress, updatedAt: Date.now() });
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all.slice(0, 50)));
}

export function getLastWatched(animeName: string): WatchProgress | undefined {
  return getWatchProgress().find(p => p.animeName === animeName);
}

// ============ Watchlist ============
export interface WatchlistItem {
  animeName: string;
  title: string;
  cover?: string;
  genres?: string[];
  score?: number;
  addedAt: number;
}

export function getWatchlist(): WatchlistItem[] {
  try {
    const data = localStorage.getItem(WATCHLIST_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch { return []; }
}

export function addToWatchlist(item: WatchlistItem) {
  const list = getWatchlist().filter(w => w.animeName !== item.animeName);
  list.unshift({ ...item, addedAt: Date.now() });
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

export function removeFromWatchlist(animeName: string) {
  const list = getWatchlist().filter(w => w.animeName !== animeName);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

export function isInWatchlist(animeName: string): boolean {
  return getWatchlist().some(w => w.animeName === animeName);
}
