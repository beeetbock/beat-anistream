import { useEffect, useState, useMemo } from "react";
import { fetchAnimeList, AnimeItem } from "@/lib/api";
import { getWatchProgress, getWatchlist, WatchProgress, WatchlistItem } from "@/lib/storage";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AnimeRow from "@/components/AnimeRow";
import ContinueWatching from "@/components/ContinueWatching";
import WatchlistSection from "@/components/WatchlistSection";
import Footer from "@/components/Footer";
import SkeletonCard from "@/components/SkeletonCard";

export default function Index() {
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [continueItems, setContinueItems] = useState<WatchProgress[]>([]);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setContinueItems(getWatchProgress());
    setWatchlistItems(getWatchlist());

    fetchAnimeList()
      .then(setAnime)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const byGenre = useMemo(() => {
    const map: Record<string, AnimeItem[]> = {};
    anime.forEach(a => {
      a.meta?.genres?.forEach(g => {
        if (!map[g]) map[g] = [];
        if (map[g].length < 20) map[g].push(a);
      });
    });
    return map;
  }, [anime]);

  const popular = useMemo(() =>
    [...anime].sort((a, b) => (b.meta?.averageScore || 0) - (a.meta?.averageScore || 0)).slice(0, 20),
    [anime]
  );

  const recent = useMemo(() =>
    [...anime].filter(a => a.meta?.status === "RELEASING").slice(0, 20),
    [anime]
  );

  const trending = useMemo(() =>
    [...anime].sort((a, b) => (b.meta?.popularity || 0) - (a.meta?.popularity || 0)).slice(0, 20),
    [anime]
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      {loading ? (
        <div className="pt-16">
          <div className="h-[70vh] shimmer" />
          <div className="container py-8">
            <div className="h-8 w-48 shimmer rounded mb-4" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-primary text-lg font-display font-bold">Failed to load</p>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">{error}</p>
            <p className="text-muted-foreground text-xs">The API might be waking up (free tier). Try again in 30s.</p>
            <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Retry
            </button>
          </div>
        </div>
      ) : (
        <>
          <HeroSection anime={anime} />
          <div className="-mt-16 relative z-10">
            <ContinueWatching items={continueItems} />
            <WatchlistSection
              items={watchlistItems}
              onRemove={(name) => setWatchlistItems(prev => prev.filter(w => w.animeName !== name))}
            />
            {trending.length > 0 && <AnimeRow title="🔥 Trending" anime={trending} linkTo="/search" />}
            <AnimeRow title="⭐ Most Popular" anime={popular} linkTo="/search" />
            {recent.length > 0 && <AnimeRow title="📺 Currently Airing" anime={recent} linkTo="/search" />}
            {Object.entries(byGenre).slice(0, 8).map(([genre, items]) => (
              <AnimeRow key={genre} title={genre} anime={items} linkTo={`/genre/${genre}`} />
            ))}
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}
