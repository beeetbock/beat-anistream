import { Link } from "react-router-dom";
import { Star, Play } from "lucide-react";
import { AnimeItem, getAnimeName } from "@/lib/api";

interface Props {
  anime: AnimeItem;
  index?: number;
}

export default function AnimeCard({ anime, index = 0 }: Props) {
  const name = getAnimeName(anime);
  const cover = anime.meta?.image?.cover;
  const score = anime.meta?.averageScore;
  const genres = anime.meta?.genres?.slice(0, 2);
  const status = anime.meta?.status;

  return (
    <Link
      to={`/anime/${encodeURIComponent(anime.anime_name)}`}
      className="group relative flex-shrink-0 w-[160px] sm:w-[180px] animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden card-hover">
        {cover ? (
          <img src={cover} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <Play className="text-muted-foreground" size={32} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1 mb-1">
            <Play size={14} className="text-primary fill-primary" />
            <span className="text-xs font-medium text-primary">Watch Now</span>
          </div>
        </div>
        {score && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold">{(score / 10).toFixed(1)}</span>
          </div>
        )}
        {status === "RELEASING" && (
          <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">
            AIRING
          </div>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2">{name}</h3>
      {genres && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{genres.join(" · ")}</p>
      )}
    </Link>
  );
}
