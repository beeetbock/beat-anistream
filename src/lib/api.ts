const BASE = "https://beat-anime-hind-hub-api.onrender.com";

export interface AnimeMeta {
  title?: { english?: string; romaji?: string };
  image?: { cover?: string; banner?: string; color?: string };
  genres?: string[];
  averageScore?: number;
  status?: string;
  type?: string;
  totalEpisodes?: number;
  description?: string;
  season?: string;
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number };
  episodeDuration?: number;
  isAdult?: boolean;
  synonyms?: string[];
  popularity?: number;
  trailer?: { url?: string };
  studios?: string[];
  characters?: { name: string; image: string; role: string }[];
  relations?: any[];
  anilistId?: number;
  malId?: number;
  nextAiringEpisode?: any;
}

export interface AnimeItem {
  anime_name: string;
  meta?: AnimeMeta;
}

export interface EpisodeQuality {
  quality: string;
  stream_url: string;
  download_url?: string;
}

export interface EpisodeInfo {
  anime_name: string;
  episode_no: number;
  stream_url: string;
  download_url?: string;
  servers?: { name: string; priority: number; stream_url: string }[];
  qualities?: EpisodeQuality[];
}

export interface AnimeDetail {
  anime_name: string;
  meta?: AnimeMeta;
  episodes?: {
    total_seasons: number;
    total_episodes: number;
    seasons: {
      season: string;
      episodes: { episode_no: number; qualities?: EpisodeQuality[] }[];
    }[];
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error("API returned unsuccessful");
  return data;
}

export async function fetchAnimeList(meta = true): Promise<AnimeItem[]> {
  const data = await apiFetch<{ anime: AnimeItem[] }>(`/api/anime/list${meta ? "" : "?meta=false"}`);
  return data.anime || [];
}

export async function fetchAnimeInfo(name: string, season?: number): Promise<AnimeDetail> {
  const encoded = encodeURIComponent(name);
  const seasonParam = season ? `&season=${season}` : "";
  return apiFetch<AnimeDetail>(`/api/anime/info?name=${encoded}${seasonParam}`);
}

export async function fetchEpisode(name: string, episode: number, quality?: string): Promise<EpisodeInfo> {
  const encoded = encodeURIComponent(name);
  const qParam = quality ? `&quality=${quality}` : "";
  return apiFetch<EpisodeInfo>(`/api/anime/episode?name=${encoded}&episode=${episode}${qParam}`);
}

export async function fetchQualities(name: string, episode: number): Promise<EpisodeQuality[]> {
  const encoded = encodeURIComponent(name);
  const data = await apiFetch<{ qualities: EpisodeQuality[] }>(`/api/anime/qualities?name=${encoded}&episode=${episode}`);
  return data.qualities || [];
}

export async function fetchAnimeMeta(name: string): Promise<AnimeMeta> {
  const encoded = encodeURIComponent(name);
  const data = await apiFetch<{ meta: AnimeMeta }>(`/api/anime/meta?name=${encoded}`);
  return data.meta;
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const data = await apiFetch<{ results: AnimeItem[] }>(`/api/anime/search?q=${encodeURIComponent(query)}`);
  return data.results || [];
}

export function getDownloadUrl(gofileUrl: string): string {
  return `${BASE}/api/anime/download?url=${encodeURIComponent(gofileUrl)}`;
}

export function getAnimeName(item: AnimeItem): string {
  return item.meta?.title?.english || item.meta?.title?.romaji || item.anime_name;
}
