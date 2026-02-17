import { Link } from "react-router-dom";
import { Play, Clock } from "lucide-react";
import { WatchProgress } from "@/lib/storage";

interface Props {
  items: WatchProgress[];
}

export default function ContinueWatching({ items }: Props) {
  if (!items.length) return null;

  return (
    <section className="py-4">
      <div className="container">
        <h2 className="font-display font-bold text-xl sm:text-2xl mb-4 flex items-center gap-2">
          <Clock size={22} className="text-primary" /> Continue Watching
        </h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {items.map(item => {
            const progress = item.duration > 0 ? (item.timestamp / item.duration) * 100 : 0;
            return (
              <Link
                key={`${item.animeName}-${item.episode}`}
                to={`/watch/${encodeURIComponent(item.animeName)}/${item.episode}`}
                className="flex-shrink-0 w-[240px] sm:w-[280px] group"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden card-hover">
                  {item.cover ? (
                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <Play className="text-muted-foreground" size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary/90 rounded-full p-3">
                      <Play size={20} className="fill-primary-foreground text-primary-foreground ml-0.5" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/20">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium truncate">{item.title || item.animeName}</p>
                  <p className="text-xs text-muted-foreground">Episode {item.episode}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
