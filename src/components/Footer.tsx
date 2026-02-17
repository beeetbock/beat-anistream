import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-12">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Beat AniStream" className="h-10 w-10 rounded-lg" />
            <div>
              <h3 className="font-display font-bold text-lg text-glow-red">Beat AniStream</h3>
              <p className="text-xs text-muted-foreground">Your ultimate anime streaming destination</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link>
            <Link to="/search" className="text-muted-foreground hover:text-primary transition-colors">Browse</Link>
            <Link to="/genre/Action" className="text-muted-foreground hover:text-primary transition-colors">Action</Link>
            <Link to="/genre/Romance" className="text-muted-foreground hover:text-primary transition-colors">Romance</Link>
            <Link to="/genre/Fantasy" className="text-muted-foreground hover:text-primary transition-colors">Fantasy</Link>
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <a href="https://t.me/BeatAnime" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-neon hover:underline">
              <ExternalLink size={14} /> @BeatAnime
            </a>
            <a href="https://t.me/Beat_Hindi_Dubbed" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-neon hover:underline">
              <ExternalLink size={14} /> @Beat_Hindi_Dubbed
            </a>
            <a href="https://t.me/Beat_Anime_Discussion" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <ExternalLink size={14} /> Support Group
            </a>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Beat AniStream. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
