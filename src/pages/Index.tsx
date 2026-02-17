import { useEffect, useState, useMemo } from "react";
import { fetchAnimeList, AnimeItem } from "@/lib/api";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AnimeRow from "@/components/AnimeRow";
import Footer from "@/components/Footer";
import SkeletonCard from "@/components/SkeletonCard";

export default function Index() {
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
          <div className="text-center">
            <p className="text-primary text-lg mb-2">Failed to load</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">Retry</button>
          </div>
        </div>
      ) : (
        <>
          <HeroSection anime={anime} />
          <div className="-mt-16 relative z-10">
            <AnimeRow title="🔥 Popular" anime={popular} linkTo="/search" />
            {Object.entries(byGenre).slice(0, 6).map(([genre, items]) => (
              <AnimeRow key={genre} title={genre} anime={items} linkTo={`/genre/${genre}`} />
            ))}
          </div>
        </>
      )}
      <Footer />
    </div>
  );
}
