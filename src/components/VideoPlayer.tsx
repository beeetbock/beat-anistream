import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipForward, SkipBack, Loader2, FastForward, Rewind, Cast } from "lucide-react";
import { useVideoBuffer } from "@/hooks/useVideoBuffer";

interface Props {
  src: string;
  title?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onTimeUpdate?: (time: number, duration: number) => void;
  initialTime?: number;
  skipIntroAt?: [number, number];
  skipOutroAt?: [number, number];
  autoPlayNext?: boolean;
}

export default function VideoPlayer({ src, title, onPrev, onNext, onTimeUpdate, initialTime, skipIntroAt, skipOutroAt, autoPlayNext = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [is2x, setIs2x] = useState(false);
  const [showAutoPlayBanner, setShowAutoPlayBanner] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(5);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [castAvailable, setCastAvailable] = useState(false);

  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const holdTimer = useRef<ReturnType<typeof setTimeout>>();
  const autoPlayTimer = useRef<ReturnType<typeof setInterval>>();
  const previewFrames = useRef<Map<number, string>>(new Map());
  const video = videoRef.current;
  const bufferState = useVideoBuffer(videoRef);

  // Check cast availability
  useEffect(() => {
    if ((window as any).chrome?.cast) setCastAvailable(true);
    window.addEventListener('cast-available', () => setCastAvailable(true));
  }, []);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setShowAutoPlayBanner(false);
    previewFrames.current.clear();
  }, [src]);

  useEffect(() => {
    if (initialTime && video && duration > 0) {
      video.currentTime = initialTime;
    }
  }, [initialTime, duration]);

  // Generate preview frames at key intervals using canvas
  const generatePreviewFrame = useCallback((time: number) => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || previewFrames.current.has(Math.round(time))) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tempVideo = document.createElement('video');
    tempVideo.src = v.src;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;

    tempVideo.addEventListener('seeked', () => {
      ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      previewFrames.current.set(Math.round(time), dataUrl);
      tempVideo.remove();
    }, { once: true });

    tempVideo.currentTime = time;
  }, []);

  // Pre-generate frames at intervals when video loads
  useEffect(() => {
    if (!duration || duration === 0) return;
    const interval = Math.max(10, Math.floor(duration / 20));
    for (let t = 0; t <= duration; t += interval) {
      setTimeout(() => generatePreviewFrame(t), t * 50);
    }
  }, [duration, generatePreviewFrame]);

  // Get closest preview frame
  const getPreviewFrame = (time: number): string | null => {
    if (previewFrames.current.size === 0) return null;
    const keys = Array.from(previewFrames.current.keys());
    const closest = keys.reduce((a, b) => Math.abs(b - time) < Math.abs(a - time) ? b : a);
    return previewFrames.current.get(closest) || null;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); v.paused ? v.play() : v.pause(); break;
        case "arrowleft": case "j": e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); break;
        case "arrowright": case "l": e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 10); break;
        case "arrowup": e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); break;
        case "arrowdown": e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "m": e.preventDefault(); v.muted = !v.muted; setMuted(v.muted); break;
        case "n": if (onNext) { e.preventDefault(); onNext(); } break;
        case "p": if (onPrev) { e.preventDefault(); onPrev(); } break;
      }
    };
    // Space hold for 2x
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const v = videoRef.current;
        if (!v || e.target instanceof HTMLInputElement) return;
        e.preventDefault();
        holdTimer.current = setTimeout(() => {
          v.playbackRate = 2;
          setIs2x(true);
          setPlaybackRate(2);
        }, 500);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        clearTimeout(holdTimer.current);
        if (is2x) {
          const v = videoRef.current;
          if (v) { v.playbackRate = 1; setIs2x(false); setPlaybackRate(1); }
        } else {
          const v = videoRef.current;
          if (v) v.paused ? v.play() : v.pause();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playbackRate, onNext, onPrev, is2x]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Auto-play next episode
  useEffect(() => {
    if (!showAutoPlayBanner || !onNext) return;
    let count = 5;
    setAutoPlayCountdown(count);
    autoPlayTimer.current = setInterval(() => {
      count--;
      setAutoPlayCountdown(count);
      if (count <= 0) {
        clearInterval(autoPlayTimer.current);
        onNext();
      }
    }, 1000);
    return () => clearInterval(autoPlayTimer.current);
  }, [showAutoPlayBanner, onNext]);

  const togglePlay = useCallback(() => {
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }, [video]);

  const seek = (seconds: number) => {
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handleTimeUpdate = () => {
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    onTimeUpdate?.(video.currentTime, video.duration);
    if (skipIntroAt) setShowSkipIntro(video.currentTime >= skipIntroAt[0] && video.currentTime < skipIntroAt[1]);
    if (skipOutroAt) setShowSkipOutro(video.currentTime >= skipOutroAt[0] && video.currentTime < skipOutroAt[1]);
    // Auto-play banner: show when 30s remain
    if (autoPlayNext && onNext && duration > 0 && duration - video.currentTime <= 30 && !showAutoPlayBanner) {
      setShowAutoPlayBanner(true);
    }
  };

  const handleEnded = () => {
    if (autoPlayNext && onNext) {
      setShowAutoPlayBanner(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!video || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen();
  };

  // YouTube-style: click to toggle controls, auto-hide when playing
  const handleContainerClick = () => {
    if (showControls && playing) {
      // Hide controls immediately on click
      setShowControls(false);
      clearTimeout(hideTimer.current);
    } else {
      togglePlay();
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Double-tap mobile
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

  // Mobile hold for 2x
  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (v) { v.playbackRate = 2; setIs2x(true); setPlaybackRate(2); }
    }, 500);
  };
  const handleTouchEnd = () => {
    clearTimeout(holdTimer.current);
    if (is2x) {
      const v = videoRef.current;
      if (v) { v.playbackRate = 1; setIs2x(false); setPlaybackRate(1); }
    }
  };

  const handleCast = async () => {
    try {
      if ((navigator as any).presentation) {
        const req = new (window as any).PresentationRequest([src]);
        await req.start();
      }
    } catch {
      // Fallback: show toast
      alert("Cast not supported on this device/browser. Try Chrome on a Chromecast-enabled network.");
    }
  };

  const previewFrame = hoverTime !== null ? getPreviewFrame(hoverTime) : null;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden aspect-video select-none"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={(e) => { handleTap(e); handleTouchStart(); }}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
    >
      {/* Hidden canvas for frame generation */}
      <canvas ref={canvasRef} width={160} height={90} className="hidden" />

      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (videoRef.current) { setDuration(videoRef.current.duration); setLoading(false); } }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={() => { setPlaying(true); setShowAutoPlayBanner(false); }}
        onPause={() => setPlaying(false)}
        onEnded={handleEnded}
        muted={muted}
        playsInline
        preload="auto"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
        </div>
      )}

      {/* 2x speed indicator */}
      {is2x && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
          <FastForward size={16} className="fill-white" /> 2× Speed
        </div>
      )}

      {/* Double-tap ripple */}
      {ripple && (
        <div className={`absolute top-0 ${ripple.side === "left" ? "left-0" : "right-0"} w-1/2 h-full flex items-center justify-center pointer-events-none`}>
          <div className="w-20 h-20 bg-white/10 rounded-full animate-ping" />
          <div className="absolute flex items-center gap-1 text-white/90">
            {ripple.side === "left" ? <Rewind size={20} /> : <FastForward size={20} />}
            <span className="text-sm font-bold">10s</span>
          </div>
        </div>
      )}

      {/* Skip Intro */}
      {showSkipIntro && (
        <button onClick={(e) => { e.stopPropagation(); if (video && skipIntroAt) video.currentTime = skipIntroAt[1]; }}
          className="absolute bottom-24 right-4 bg-white/90 text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white transition-colors z-20 animate-fade-in">
          Skip Intro →
        </button>
      )}

      {/* Skip Outro */}
      {showSkipOutro && (
        <button onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}
          className="absolute bottom-24 right-4 bg-white/90 text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white transition-colors z-20 animate-fade-in">
          Next Episode →
        </button>
      )}

      {/* Auto-play next banner */}
      {showAutoPlayBanner && onNext && (
        <div className="absolute bottom-20 right-4 bg-black/90 border border-border rounded-xl p-4 z-20 flex items-center gap-4 animate-fade-in" onClick={e => e.stopPropagation()}>
          <div>
            <p className="text-xs text-muted-foreground">Next Episode in</p>
            <p className="text-2xl font-bold text-primary">{autoPlayCountdown}s</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { clearInterval(autoPlayTimer.current); onNext(); }}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              Play Now
            </button>
            <button onClick={() => { clearInterval(autoPlayTimer.current); setShowAutoPlayBanner(false); }}
              className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium border border-border">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between">
          {title && <p className="text-sm font-medium truncate text-white">{title}</p>}
          <div className="flex items-center gap-2">
            {is2x && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">2×</span>}
            {playbackRate !== 1 && !is2x && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{playbackRate}×</span>}
            {!bufferState.isBufferHealthy && playing && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded animate-pulse">Buffering…</span>
            )}
          </div>
        </div>

        {/* Center controls */}
        <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
          <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="pointer-events-auto bg-black/30 backdrop-blur-sm rounded-full p-3 hover:bg-black/50 transition-colors">
            <SkipBack size={22} className="text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="pointer-events-auto bg-primary/90 rounded-full p-5 hover:bg-primary transition-all hover:scale-110">
            {playing ? <Pause size={32} className="text-white" /> : <Play size={32} className="text-white ml-1" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="pointer-events-auto bg-black/30 backdrop-blur-sm rounded-full p-3 hover:bg-black/50 transition-colors">
            <SkipForward size={22} className="text-white" />
          </button>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pb-3 pt-8 space-y-2">
          {/* Progress bar with YouTube-style preview */}
          <div
            ref={progressRef}
            className="relative h-1 hover:h-3 bg-white/20 rounded-full cursor-pointer group/bar transition-all duration-150"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Buffered */}
            <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }} />
            {/* Progress */}
            <div className="absolute h-full bg-primary rounded-full transition-[width]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-[0_0_8px_hsl(var(--primary))]" />
            </div>

            {/* YouTube-style seek preview */}
            {hoverTime !== null && (
              <div
                className="absolute bottom-6 pointer-events-none transform -translate-x-1/2 z-30"
                style={{ left: `${hoverX}px` }}
              >
                {previewFrame ? (
                  <img src={previewFrame} alt="preview" className="w-40 h-24 object-cover rounded-md border-2 border-white/20 shadow-xl" />
                ) : (
                  <div className="w-40 h-24 bg-black/80 rounded-md border-2 border-white/20 shadow-xl flex items-center justify-center">
                    <span className="text-white/50 text-xs">Preview</span>
                  </div>
                )}
                <div className="text-center mt-1">
                  <span className="text-white text-xs font-mono bg-black/80 px-2 py-0.5 rounded">{formatTime(hoverTime)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              {onPrev && <button onClick={onPrev} className="hover:text-primary transition-colors p-1"><SkipBack size={18} /></button>}
              <button onClick={togglePlay} className="hover:text-primary transition-colors p-1">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              {onNext && <button onClick={onNext} className="hover:text-primary transition-colors p-1"><SkipForward size={18} /></button>}

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-1 group/vol">
                <button onClick={() => { if (video) { video.muted = !video.muted; setMuted(!muted); } }} className="hover:text-primary transition-colors p-1">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                  onChange={e => { const v = parseFloat(e.target.value); if (video) { video.volume = v; video.muted = v === 0; } setVolume(v); setMuted(v === 0); }}
                  className="w-0 group-hover/vol:w-20 transition-all accent-primary cursor-pointer" />
              </div>

              <span className="text-xs text-white/60 font-mono hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Subtitles toggle */}
              <button
                onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                className={`text-xs px-2 py-1 rounded transition-colors ${subtitlesEnabled ? "bg-primary text-primary-foreground" : "text-white/70 hover:text-white"}`}
                title="Subtitles (auto-generated)"
              >
                CC
              </button>

              {/* Speed */}
              <select value={playbackRate}
                onChange={e => { const r = parseFloat(e.target.value); if (video) video.playbackRate = r; setPlaybackRate(r); }}
                className="bg-transparent text-xs border border-white/20 rounded px-1.5 py-1 cursor-pointer hover:border-white/50 transition-colors text-white"
                onClick={e => e.stopPropagation()}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                  <option key={r} value={r} className="bg-black">{r}×</option>
                ))}
              </select>

              {/* Cast */}
              <button onClick={handleCast} className="hover:text-primary transition-colors p-1" title="Cast to TV">
                <Cast size={16} />
              </button>

              <button onClick={toggleFullscreen} className="hover:text-primary transition-colors p-1">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
