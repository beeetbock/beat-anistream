import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchAnimeInfo, AnimeDetail as AnimeDetailType, getAnimeName } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Play, Star, Calendar, Clock, Tv, ExternalLink } from "lucide-react";

export default function AnimeDetailPage() {
  const { name } = useParams();
  const [data, setData] = useState<AnimeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(0);
  const [showAllChars, setShowAllChars] = useState(false);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    fetchAnimeInfo(decodeURIComponent(name))
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16 h-[60vh] shimmer" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 text-center">
        <p className="text-xl text-primary mb-4">Anime not found</p>
        <Link to="/" className="text-sm text-neon hover:underline">Go Home</Link>
      </div>
    </div>
  );

  const title = getAnimeName({ anime_name: data.anime_name, meta: data.meta });
  const meta = data.meta;
  const banner = meta?.image?.banner;
  const cover = meta?.image?.cover;
  const desc = meta?.description?.replace(/<[^>]*>/g, "");
  const seasons = data.episodes?.seasons || [];
  const currentEps = seasons[activeSeason]?.episodes || [];
  const characters = meta?.characters || [];
  const displayChars = showAllChars ? characters : characters.slice(0, 12);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Banner */}
      <div className="relative h-[50vh] sm:h-[60vh]">
        {banner && <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 gradient-overlay" />
        <div className="absolute inset-0 gradient-overlay-left" />
      </div>

      {/* Info section */}
      <div className="container relative -mt-48 z-10">
        <div className="flex flex-col sm:flex-row gap-6">
          {cover && (
            <div className="flex-shrink-0">
              <img src={cover} alt={title} className="w-40 sm:w-52 rounded-lg shadow-2xl neon-border" />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-4">
            <h1 className="font-display font-black text-3xl sm:text-4xl mb-2">{title}</h1>
            {meta?.title?.romaji && meta.title.romaji !== title && (
              <p className="text-muted-foreground text-sm mb-3">{meta.title.romaji}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
              {meta?.averageScore && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Star size={14} className="fill-yellow-400" /> {(meta.averageScore / 10).toFixed(1)}
                </span>
              )}
              {meta?.status && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-medium">{meta.status}</span>}
              {meta?.type && <span className="flex items-center gap-1 text-muted-foreground"><Tv size={14} /> {meta.type}</span>}
              {meta?.totalEpisodes && <span className="text-muted-foreground">{meta.totalEpisodes} eps</span>}
              {meta?.episodeDuration && <span className="flex items-center gap-1 text-muted-foreground"><Clock size={14} /> {meta.episodeDuration}min</span>}
              {meta?.startDate?.year && <span className="flex items-center gap-1 text-muted-foreground"><Calendar size={14} /> {meta.startDate.year}</span>}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {meta?.genres?.map(g => (
                <Link key={g} to={`/genre/${g}`} className="text-xs bg-secondary hover:bg-secondary/80 px-3 py-1 rounded-full transition-colors">{g}</Link>
              ))}
            </div>

            {meta?.studios?.length && (
              <p className="text-sm text-muted-foreground mb-3">Studio: <span className="text-foreground">{meta.studios.join(", ")}</span></p>
            )}

            {desc && <p className="text-sm text-foreground/80 leading-relaxed mb-4 line-clamp-4">{desc}</p>}

            <Link
              to={`/watch/${encodeURIComponent(data.anime_name)}/1`}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-lg transition-all hover:shadow-[0_0_20px_hsl(0_85%_55%_/_0.4)]"
            >
              <Play size={18} className="fill-current" /> Watch Episode 1
            </Link>
          </div>
        </div>

        {/* Seasons & Episodes */}
        {seasons.length > 0 && (
          <section className="mt-10">
            {seasons.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
                {seasons.map((s, i) => (
                  <button
                    key={s.season}
                    onClick={() => setActiveSeason(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      i === activeSeason ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    Season {s.season}
                  </button>
                ))}
              </div>
            )}
            <h2 className="font-display font-bold text-xl mb-3">Episodes</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {currentEps.map(ep => (
                <Link
                  key={ep.episode_no}
                  to={`/watch/${encodeURIComponent(data.anime_name)}/${ep.episode_no}`}
                  className="flex items-center justify-center h-12 bg-secondary hover:bg-primary/20 hover:border-primary/50 border border-border rounded-lg text-sm font-medium transition-all"
                >
                  {ep.episode_no}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Trailer */}
        {meta?.trailer?.url && (
          <section className="mt-10">
            <h2 className="font-display font-bold text-xl mb-3">Trailer</h2>
            <div className="aspect-video max-w-2xl rounded-lg overflow-hidden">
              <iframe
                src={meta.trailer.url.replace("watch?v=", "embed/")}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay"
                title="Trailer"
              />
            </div>
          </section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display font-bold text-xl mb-3">Characters</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {displayChars.map(c => (
                <div key={c.name} className="text-center">
                  {c.image && <img src={c.image} alt={c.name} className="w-full aspect-square object-cover rounded-lg mb-1.5" loading="lazy" />}
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.role}</p>
                </div>
              ))}
            </div>
            {characters.length > 12 && (
              <button onClick={() => setShowAllChars(!showAllChars)} className="mt-3 text-sm text-primary hover:underline">
                {showAllChars ? "Show Less" : `Show All (${characters.length})`}
              </button>
            )}
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
