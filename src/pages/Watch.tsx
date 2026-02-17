import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchEpisode, fetchAnimeInfo, EpisodeInfo, AnimeDetail, getAnimeName, getDownloadUrl } from "@/lib/api";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import { Download, Server, MonitorPlay, ChevronRight } from "lucide-react";

export default function WatchPage() {
  const { name, episode } = useParams();
  const navigate = useNavigate();
  const [epData, setEpData] = useState<EpisodeInfo | null>(null);
  const [animeData, setAnimeData] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeServer, setActiveServer] = useState(0);
  const [activeQuality, setActiveQuality] = useState<string>("");
  const [currentUrl, setCurrentUrl] = useState("");

  const decodedName = name ? decodeURIComponent(name) : "";
  const epNum = parseInt(episode || "1");

  useEffect(() => {
    if (!decodedName || !epNum) return;
    setLoading(true);
    Promise.all([
      fetchEpisode(decodedName, epNum),
      fetchAnimeInfo(decodedName),
    ])
      .then(([ep, info]) => {
        setEpData(ep);
        setAnimeData(info);
        setCurrentUrl(ep.stream_url);
        if (ep.qualities?.length) setActiveQuality(ep.qualities[0].quality);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [decodedName, epNum]);

  const switchServer = (index: number) => {
    if (!epData?.servers?.[index]) return;
    setActiveServer(index);
    setCurrentUrl(epData.servers[index].stream_url);
  };

  const switchQuality = (q: string) => {
    const qual = epData?.qualities?.find(x => x.quality === q);
    if (qual) { setActiveQuality(q); setCurrentUrl(qual.stream_url); }
  };

  const seasons = animeData?.episodes?.seasons || [];
  const allEps = seasons.flatMap(s => s.episodes);
  const title = animeData ? getAnimeName({ anime_name: animeData.anime_name, meta: animeData.meta }) : decodedName;

  const goPrev = () => epNum > 1 && navigate(`/watch/${name}/${epNum - 1}`);
  const goNext = () => {
    const maxEp = allEps.length || (animeData?.meta?.totalEpisodes || 999);
    if (epNum < maxEp) navigate(`/watch/${name}/${epNum + 1}`);
  };

  if (loading) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 container">
        <div className="aspect-video shimmer rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-20 pb-10">
        <div className="container">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight size={14} />
            <Link to={`/anime/${name}`} className="hover:text-primary transition-colors">{title}</Link>
            <ChevronRight size={14} />
            <span className="text-foreground">Episode {epNum}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div>
              {/* Player */}
              {currentUrl ? (
                <VideoPlayer
                  src={currentUrl}
                  title={`${title} - Episode ${epNum}`}
                  onPrev={epNum > 1 ? goPrev : undefined}
                  onNext={goNext}
                />
              ) : (
                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No stream available</p>
                </div>
              )}

              {/* Controls */}
              <div className="mt-4 space-y-3">
                <h1 className="font-display font-bold text-xl">{title} - Episode {epNum}</h1>

                {/* Servers */}
                {epData?.servers && epData.servers.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Server size={16} className="text-muted-foreground" />
                    {epData.servers.map((s, i) => (
                      <button
                        key={s.name}
                        onClick={() => switchServer(i)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          i === activeServer ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/50"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quality */}
                {epData?.qualities && epData.qualities.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <MonitorPlay size={16} className="text-muted-foreground" />
                    {epData.qualities.map(q => (
                      <button
                        key={q.quality}
                        onClick={() => switchQuality(q.quality)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          q.quality === activeQuality ? "bg-neon text-accent-foreground border-neon" : "bg-secondary border-border hover:border-neon/50"
                        }`}
                      >
                        {q.quality}
                      </button>
                    ))}
                  </div>
                )}

                {/* Download */}
                {epData?.download_url && (
                  <a
                    href={getDownloadUrl(epData.download_url)}
                    download
                    className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 border border-border text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download size={16} /> Download Episode
                  </a>
                )}
              </div>
            </div>

            {/* Episode sidebar */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="font-display font-semibold text-sm">Episodes</h3>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {allEps.map(ep => (
                  <Link
                    key={ep.episode_no}
                    to={`/watch/${name}/${ep.episode_no}`}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                      ep.episode_no === epNum ? "bg-primary/10 text-primary border-l-2 border-primary" : "hover:bg-secondary/80 border-l-2 border-transparent"
                    }`}
                  >
                    <span className="font-mono text-xs w-8 text-center">{ep.episode_no}</span>
                    <span>Episode {ep.episode_no}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
