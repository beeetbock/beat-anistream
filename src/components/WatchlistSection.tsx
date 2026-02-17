import { Link } from "react-router-dom";
import { Bookmark, Star, X } from "lucide-react";
import { WatchlistItem, removeFromWatchlist } from "@/lib/storage";

interface Props {
  items: WatchlistItem[];
  onRemove?: (name: string) => void;
}

export default function WatchlistSection({ items, onRemove }: Props) {
  if (!items.length) return null;

  const handleRemove = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchlist(name);
    onRemove?.(name);
  };

  return (
    <section className="py-4">
      <div className="container">
        <h2 className="font-display font-bold text-xl sm:text-2xl mb-4 flex items-center gap-2">
          <Bookmark size={22} className="text-neon" /> My Watchlist
        </h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {items.map(item => (
            <Link
              key={item.animeName}
              to={`/anime/${encodeURIComponent(item.animeName)}`}
              className="flex-shrink-0 w-[160px] sm:w-[180px] group"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden card-hover">
                {item.cover ? (
                  <img src={item.cover} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-secondary" />
                )}
                <button
                  onClick={e => handleRemove(e, item.animeName)}
                  className="absolute top-2 right-2 bg-background/80 hover:bg-destructive rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X size={14} />
                </button>
                {item.score && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 rounded px-1.5 py-0.5">
                    <Star size={10} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-bold">{(item.score / 10).toFixed(1)}</span>
                  </div>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium leading-tight line-clamp-2">{item.title}</h3>
              {item.genres && <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.genres.slice(0, 2).join(" · ")}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
