import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AnimeCard from "./AnimeCard";
import { AnimeItem } from "@/lib/api";

interface Props {
  title: string;
  anime: AnimeItem[];
  linkTo?: string;
}

export default function AnimeRow({ title, anime, linkTo }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (!anime.length) return null;

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 400, behavior: "smooth" });
  };

  return (
    <section className="py-4">
      <div className="container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl sm:text-2xl">{title}</h2>
          <div className="flex items-center gap-2">
            {linkTo && (
              <Link to={linkTo} className="text-sm text-primary hover:text-primary/80 transition-colors mr-2">View All</Link>
            )}
            <button onClick={() => scroll(-1)} className="bg-secondary/60 hover:bg-secondary rounded-full p-1.5 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => scroll(1)} className="bg-secondary/60 hover:bg-secondary rounded-full p-1.5 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {anime.map((a, i) => (
            <AnimeCard key={a.anime_name} anime={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
