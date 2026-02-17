import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack, Settings, Loader2 } from "lucide-react";

interface Props {
  src: string;
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function VideoPlayer({ src, title, onPrev, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const video = videoRef.current;

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
  }, [src]);

  const togglePlay = useCallback(() => {
    if (!video) return;
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  }, [video]);

  const seek = (seconds: number) => {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleTimeUpdate = () => {
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Double-tap to seek on mobile
  const lastTap = useRef<{ time: number; side: string }>({ time: 0, side: "" });
  const [ripple, setRipple] = useState<{ side: string; key: number } | null>(null);

  const handleTap = (e: React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.changedTouches[0].clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();
    if (now - lastTap.current.time < 300 && lastTap.current.side === side) {
      seek(side === "right" ? 10 : -10);
      setRipple({ side, key: now });
      setTimeout(() => setRipple(null), 600);
    }
    lastTap.current = { time: now, side };
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden aspect-video group cursor-pointer"
      onMouseMove={showControlsTemporarily}
      onTouchStart={handleTap}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        muted={muted}
        playsInline
      />

      {/* Loading spinner */}
      {loading && !playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="animate-spin text-primary" size={48} />
        </div>
      )}

      {/* Ripple effect for double-tap */}
      {ripple && (
        <div className={`absolute top-0 ${ripple.side === "left" ? "left-0" : "right-0"} w-1/2 h-full flex items-center justify-center pointer-events-none`}>
          <div className="w-16 h-16 bg-foreground/20 rounded-full animate-ping" />
          <span className="absolute text-sm font-bold">{ripple.side === "left" ? "-10s" : "+10s"}</span>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        {title && (
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-4">
            <p className="text-sm font-medium truncate">{title}</p>
          </div>
        )}

        {/* Center play/pause */}
        <div className="absolute inset-0 flex items-center justify-center gap-8">
          <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="bg-black/40 rounded-full p-3 hover:bg-black/60 transition-colors">
            <SkipBack size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="bg-primary/90 rounded-full p-4 hover:bg-primary transition-colors">
            {playing ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="bg-black/40 rounded-full p-3 hover:bg-black/60 transition-colors">
            <SkipForward size={20} />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 space-y-2">
          {/* Progress bar */}
          <div className="relative h-1.5 bg-foreground/20 rounded-full cursor-pointer group/bar" onClick={handleSeek}>
            <div className="absolute h-full bg-foreground/30 rounded-full" style={{ width: `${(buffered / duration) * 100}%` }} />
            <div className="absolute h-full bg-primary rounded-full transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-[0_0_6px_hsl(0_85%_55%)]" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {onPrev && <button onClick={onPrev} className="hover:text-primary transition-colors"><SkipBack size={18} /></button>}
              <button onClick={togglePlay} className="hover:text-primary transition-colors">
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              {onNext && <button onClick={onNext} className="hover:text-primary transition-colors"><SkipForward size={18} /></button>}
              <button onClick={() => setMuted(!muted)} className="hover:text-primary transition-colors">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <span className="text-xs text-foreground/70">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors"><Maximize size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
