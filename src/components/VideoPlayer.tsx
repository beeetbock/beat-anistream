import { useRef, useState, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, FastForward, Rewind, Cast,
  Settings, X, Server, Layers
} from "lucide-react";
import { useVideoBuffer } from "@/hooks/useVideoBuffer";

interface Server {
  name: string;
  stream_url: string;
  stream_type: string;
}

interface Quality {
  quality: string;
  file_size?: string;
  servers: Server[];
  stream_url: string;
}

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
  // For in-player quality/server switching
  qualities?: Quality[];
  activeQuality?: string;
  activeServer?: string;
  onQualityChange?: (q: string) => void;
  onServerChange?: (s: string) => void;
}

export default function VideoPlayer({
  src, title, onPrev, onNext, onTimeUpdate, initialTime,
  skipIntroAt, skipOutroAt, autoPlayNext = true,
  qualities = [], activeQuality = "", activeServer = "",
  onQualityChange, onServerChange
}: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const progressRef   = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const ambientRef    = useRef<HTMLCanvasElement>(null);
  const ambientTimer  = useRef<ReturnType<typeof setInterval>>();

  const [playing, setPlaying]             = useState(false);
  const [muted, setMuted]                 = useState(false);
  const [volume, setVolume]               = useState(1);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [buffered, setBuffered]           = useState(0);
  const [loading, setLoading]             = useState(true);
  const [showControls, setShowControls]   = useState(true);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [hoverTime, setHoverTime]         = useState<number | null>(null);
  const [hoverX, setHoverX]              = useState(0);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [playbackRate, setPlaybackRate]   = useState(1);
  const [is2x, setIs2x]                  = useState(false);
  const [showAutoPlayBanner, setShowAutoPlayBanner] = useState(false);
  const [autoPlayCountdown, setAutoPlayCountdown]   = useState(5);
  const [ripple, setRipple]               = useState<{ side: string; key: number } | null>(null);

  // Settings panel state
  const [showSettings, setShowSettings]   = useState(false);
  const [settingsTab, setSettingsTab]     = useState<"main" | "quality" | "server">("main");
  const [ambientMode, setAmbientMode]     = useState(false);
  const [stableVoice, setStableVoice]     = useState(false);

  const hideTimer     = useRef<ReturnType<typeof setTimeout>>();
  const holdTimer     = useRef<ReturnType<typeof setTimeout>>();
  const autoPlayTimer = useRef<ReturnType<typeof setInterval>>();
  const previewFrames = useRef<Map<number, string>>(new Map());
  const isTouchDevice = useRef(false);
  const bufferState   = useVideoBuffer(videoRef);

  // Detect touch
  useEffect(() => {
    isTouchDevice.current = window.matchMedia("(pointer: coarse)").matches;
  }, []);

  // Reset on src change
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoading(true);
    setShowAutoPlayBanner(false);
    previewFrames.current.clear();
  }, [src]);

  // Initial time seek
  useEffect(() => {
    const v = videoRef.current;
    if (initialTime && v && duration > 0) v.currentTime = initialTime;
  }, [initialTime, duration]);

  // ─── AMBIENT MODE ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = ambientRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    clearInterval(ambientTimer.current);
    if (!ambientMode) {
      canvas.style.opacity = "0";
      return;
    }
    canvas.style.opacity = "1";
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ambientTimer.current = setInterval(() => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }, 100);
    return () => clearInterval(ambientTimer.current);
  }, [ambientMode]);

  // ─── STABLE VOICE (dynamic range compression) ──────────────────────────────
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const gainRef       = useRef<GainNode | null>(null);
  const sourceRef     = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stableVoice) {
      if (!audioCtxRef.current) {
        const ctx   = new AudioContext();
        const src   = ctx.createMediaElementSource(video);
        const comp  = ctx.createDynamicsCompressor();
        const gain  = ctx.createGain();
        comp.threshold.value = -24;
        comp.knee.value      = 30;
        comp.ratio.value     = 12;
        comp.attack.value    = 0.003;
        comp.release.value   = 0.25;
        gain.gain.value      = 1.4;
        src.connect(comp);
        comp.connect(gain);
        gain.connect(ctx.destination);
        audioCtxRef.current   = ctx;
        compressorRef.current = comp;
        gainRef.current       = gain;
        sourceRef.current     = src;
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } else {
      if (audioCtxRef.current) {
        sourceRef.current?.disconnect();
        compressorRef.current?.disconnect();
        gainRef.current?.disconnect();
        audioCtxRef.current.close();
        audioCtxRef.current   = null;
        compressorRef.current = null;
        gainRef.current       = null;
        sourceRef.current     = null;
      }
    }
  }, [stableVoice]);

  // ─── PREVIEW FRAMES ────────────────────────────────────────────────────────
  const generatePreviewFrame = useCallback((time: number) => {
    const v      = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || previewFrames.current.has(Math.round(time))) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const tmp = document.createElement("video");
    tmp.src         = v.src;
    tmp.crossOrigin = "anonymous";
    tmp.muted       = true;
    tmp.addEventListener("seeked", () => {
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
      previewFrames.current.set(Math.round(time), canvas.toDataURL("image/jpeg", 0.7));
      tmp.remove();
    }, { once: true });
    tmp.currentTime = time;
  }, []);

  useEffect(() => {
    if (!duration) return;
    const interval = Math.max(10, Math.floor(duration / 20));
    for (let t = 0; t <= duration; t += interval) {
      setTimeout(() => generatePreviewFrame(t), t * 50);
    }
  }, [duration, generatePreviewFrame]);

  const getPreviewFrame = (time: number) => {
    if (!previewFrames.current.size) return null;
    const keys    = Array.from(previewFrames.current.keys());
    const closest = keys.reduce((a, b) => Math.abs(b - time) < Math.abs(a - time) ? b : a);
    return previewFrames.current.get(closest) || null;
  };

  // ─── CONTROLS FLASH ────────────────────────────────────────────────────────
  const flashControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 1500);
  }, []);

  // ─── KEYBOARD (Desktop) ────────────────────────────────────────────────────
  useEffect(() => {
    const spaceState = { held: false, activated2x: false };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      if (!v) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        spaceState.held       = true;
        spaceState.activated2x = false;
        holdTimer.current = setTimeout(() => {
          if (!spaceState.held) return;
          spaceState.activated2x = true;
          v.playbackRate = 2;
          setIs2x(true);
          setPlaybackRate(2);
          flashControls();
        }, 500);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "k":           e.preventDefault(); v.paused ? v.play() : v.pause(); flashControls(); break;
        case "j":
        case "arrowleft":   e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); flashControls(); break;
        case "l":
        case "arrowright":  e.preventDefault(); v.currentTime = Math.min(v.duration, v.currentTime + 10); flashControls(); break;
        case "arrowup":     e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); setVolume(v.volume); break;
        case "arrowdown":   e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); setVolume(v.volume); break;
        case "f":           e.preventDefault(); toggleFullscreen(); break;
        case "m":           e.preventDefault(); v.muted = !v.muted; setMuted(v.muted); break;
        case "n":           if (onNext) { e.preventDefault(); onNext(); } break;
        case "p":           if (onPrev) { e.preventDefault(); onPrev(); } break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        clearTimeout(holdTimer.current);
        const v = videoRef.current;
        if (!v) return;
        if (spaceState.activated2x) {
          v.playbackRate = 1;
          setIs2x(false);
          setPlaybackRate(1);
        } else if (spaceState.held) {
          v.paused ? v.play() : v.pause();
          flashControls();
        }
        spaceState.held       = false;
        spaceState.activated2x = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [onNext, onPrev, flashControls]);

  // ─── AUTO-PLAY NEXT ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showAutoPlayBanner || !onNext) return;
    let count = 5;
    setAutoPlayCountdown(count);
    autoPlayTimer.current = setInterval(() => {
      count--;
      setAutoPlayCountdown(count);
      if (count <= 0) { clearInterval(autoPlayTimer.current); onNext(); }
    }, 1000);
    return () => clearInterval(autoPlayTimer.current);
  }, [showAutoPlayBanner, onNext]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }, []);

  const seek = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + s, duration));
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    onTimeUpdate?.(v.currentTime, v.duration);
    if (skipIntroAt) setShowSkipIntro(v.currentTime >= skipIntroAt[0] && v.currentTime < skipIntroAt[1]);
    if (skipOutroAt) setShowSkipOutro(v.currentTime >= skipOutroAt[0] && v.currentTime < skipOutroAt[1]);
    if (autoPlayNext && onNext && duration > 0 && duration - v.currentTime <= 30 && !showAutoPlayBanner) {
      setShowAutoPlayBanner(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    setHoverTime(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration);
    setHoverX(e.clientX - rect.left);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    document.fullscreenElement ? document.exitFullscreen() : containerRef.current.requestFullscreen();
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}` : `${m}:${sec.toString().padStart(2,"0")}`;
  };

  const handleCast = async () => {
    try {
      if ((navigator as any).presentation) {
        const req = new (window as any).PresentationRequest([src]);
        await req.start();
      }
    } catch { alert("Cast not supported. Try Chrome on a Chromecast-enabled network."); }
  };

  // ─── DESKTOP CLICK & MOUSEMOVE ─────────────────────────────────────────────
  const handleDesktopClick = () => {
    if (showSettings) { setShowSettings(false); return; }
    setShowControls(false);
    clearTimeout(hideTimer.current);
  };

  const handleMouseMove = () => {
    if (isTouchDevice.current) return;
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 1500);
  };

  // ─── MOBILE TOUCH ──────────────────────────────────────────────────────────
  const lastTap = useRef<{ time: number; side: string; timer: ReturnType<typeof setTimeout> | null }>({ time: 0, side: "", timer: null });

  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => {
      const v = videoRef.current;
      if (!v) return;
      v.playbackRate = 2;
      setIs2x(true);
      setPlaybackRate(2);
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    clearTimeout(holdTimer.current);
    if (is2x) {
      const v = videoRef.current;
      if (v) { v.playbackRate = 1; setIs2x(false); setPlaybackRate(1); }
      return;
    }
    if (showSettings) { setShowSettings(false); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.changedTouches[0].clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now  = Date.now();
    if (now - lastTap.current.time < 300 && lastTap.current.side === side) {
      if (lastTap.current.timer) clearTimeout(lastTap.current.timer);
      lastTap.current = { time: 0, side: "", timer: null };
      seek(side === "right" ? 10 : -10);
      setRipple({ side, key: now });
      setTimeout(() => setRipple(null), 600);
    } else {
      if (lastTap.current.timer) clearTimeout(lastTap.current.timer);
      lastTap.current.time = now;
      lastTap.current.side = side;
      lastTap.current.timer = setTimeout(() => {
        flashControls();
        lastTap.current.timer = null;
      }, 300);
    }
  };

  // Active servers for current quality
  const activeQualityData = qualities.find(q => q.quality === activeQuality) || qualities[0];
  const servers = activeQualityData?.servers || [];
  const previewFrame = hoverTime !== null ? getPreviewFrame(hoverTime) : null;

  // ─── SETTINGS PANEL ────────────────────────────────────────────────────────
  const SettingsPanel = () => (
    <div
      className="absolute bottom-16 right-4 z-50 w-72 bg-black/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        {settingsTab !== "main" ? (
          <button onClick={() => setSettingsTab("main")} className="text-white/70 hover:text-white text-xs flex items-center gap-1">
            ← Back
          </button>
        ) : (
          <span className="text-white text-sm font-semibold">Settings</span>
        )}
        <button onClick={() => { setShowSettings(false); setSettingsTab("main"); }} className="text-white/50 hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Main menu */}
      {settingsTab === "main" && (
        <div className="p-2 space-y-1">

          {/* Ambient Mode toggle */}
          <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors">
            <div>
              <p className="text-white text-sm font-medium">Ambient Mode</p>
              <p className="text-white/40 text-xs">Glowing colours from video extend behind player</p>
            </div>
            <button
              onClick={() => setAmbientMode(!ambientMode)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${ambientMode ? "bg-primary" : "bg-white/20"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${ambientMode ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Stable Voice toggle */}
          <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors">
            <div>
              <p className="text-white text-sm font-medium">Stable Voice</p>
              <p className="text-white/40 text-xs">Reduces loud sounds, boosts quiet dialogue</p>
            </div>
            <button
              onClick={() => setStableVoice(!stableVoice)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ml-3 ${stableVoice ? "bg-primary" : "bg-white/20"}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${stableVoice ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Quality */}
          {qualities.length > 0 && (
            <button
              onClick={() => setSettingsTab("quality")}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-white/60" />
                <span className="text-white text-sm font-medium">Quality</span>
              </div>
              <span className="text-white/50 text-xs">{activeQuality} →</span>
            </button>
          )}

          {/* Server */}
          {servers.length > 0 && (
            <button
              onClick={() => setSettingsTab("server")}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Server size={15} className="text-white/60" />
                <span className="text-white text-sm font-medium">Server</span>
              </div>
              <span className="text-white/50 text-xs">{activeServer} →</span>
            </button>
          )}
        </div>
      )}

      {/* Quality submenu */}
      {settingsTab === "quality" && (
        <div className="p-2 space-y-1">
          <p className="text-white/40 text-xs px-3 py-1">Select Quality</p>
          {qualities.map(q => (
            <button
              key={q.quality}
              onClick={() => { onQualityChange?.(q.quality); setSettingsTab("main"); setShowSettings(false); }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                q.quality === activeQuality ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white"
              }`}
            >
              <span className="text-sm font-medium">{q.quality}</span>
              <div className="flex items-center gap-2">
                {q.file_size && <span className="text-xs opacity-50">{q.file_size}</span>}
                {q.quality === activeQuality && <span className="text-xs text-primary">✓</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Server submenu */}
      {settingsTab === "server" && (
        <div className="p-2 space-y-1">
          <p className="text-white/40 text-xs px-3 py-1">Select Server</p>
          {servers.map((s, idx) => (
            <button
              key={s.name}
              onClick={() => { onServerChange?.(s.name); setSettingsTab("main"); setShowSettings(false); }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-colors ${
                s.name === activeServer ? "bg-primary/20 text-primary" : "hover:bg-white/5 text-white"
              }`}
            >
              <span className="text-sm font-medium">Server {idx + 1}{idx === 0 ? " (Primary)" : ""}</span>
              {s.name === activeServer && <span className="text-xs text-primary">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden aspect-video select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { clearTimeout(hideTimer.current); setShowControls(false); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleDesktopClick}
    >
      {/* Hidden canvas for preview frames */}
      <canvas ref={canvasRef} width={160} height={90} className="hidden" />

      {/* Ambient mode canvas — blurred glow behind video */}
      {ambientMode && (
        <canvas
          ref={ambientRef}
          width={32}
          height={18}
          className="absolute inset-0 w-[110%] h-[110%] -left-[5%] -top-[5%] blur-2xl opacity-60 pointer-events-none transition-opacity duration-500 z-0"
          style={{ filter: "blur(40px)", transform: "scale(1.1)" }}
        />
      )}

      <video
        ref={videoRef}
        src={src}
        className="relative z-10 w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { const v = videoRef.current; if (v) { setDuration(v.duration); setLoading(false); } }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlay={() => { setPlaying(true); setShowAutoPlayBanner(false); flashControls(); }}
        onPause={() => { setPlaying(false); setShowControls(true); clearTimeout(hideTimer.current); }}
        onEnded={() => { if (autoPlayNext && onNext) setShowAutoPlayBanner(true); }}
        muted={muted}
        playsInline
        preload="auto"
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 pointer-events-none">
          <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin" />
        </div>
      )}

      {/* 2x indicator */}
      {is2x && (
        <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2 bg-black/70 text-white text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 pointer-events-none">
          <FastForward size={16} className="fill-white" /> 2× Speed
        </div>
      )}

      {/* Double-tap ripple */}
      {ripple && (
        <div className={`absolute z-20 top-0 ${ripple.side === "left" ? "left-0" : "right-0"} w-1/2 h-full flex items-center justify-center pointer-events-none`}>
          <div className="w-20 h-20 bg-white/10 rounded-full animate-ping" />
          <div className="absolute flex items-center gap-1 text-white/90">
            {ripple.side === "left" ? <Rewind size={20} /> : <FastForward size={20} />}
            <span className="text-sm font-bold">10s</span>
          </div>
        </div>
      )}

      {/* Skip Intro */}
      {showSkipIntro && (
        <button onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v && skipIntroAt) v.currentTime = skipIntroAt[1]; }}
          className="absolute bottom-24 right-4 z-30 bg-white/90 text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white transition-colors">
          Skip Intro →
        </button>
      )}

      {/* Skip Outro */}
      {showSkipOutro && (
        <button onClick={(e) => { e.stopPropagation(); if (onNext) onNext(); }}
          className="absolute bottom-24 right-4 z-30 bg-white/90 text-black font-semibold text-sm px-5 py-2.5 rounded-md hover:bg-white transition-colors">
          Next Episode →
        </button>
      )}

      {/* Auto-play banner */}
      {showAutoPlayBanner && onNext && (
        <div className="absolute bottom-20 right-4 z-30 bg-black/90 border border-border rounded-xl p-4 flex items-center gap-4" onClick={e => e.stopPropagation()}>
          <div>
            <p className="text-xs text-muted-foreground">Next Episode in</p>
            <p className="text-2xl font-bold text-primary">{autoPlayCountdown}s</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { clearInterval(autoPlayTimer.current); onNext(); }} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Play Now</button>
            <button onClick={() => { clearInterval(autoPlayTimer.current); setShowAutoPlayBanner(false); }} className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm font-medium border border-border">Cancel</button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && <SettingsPanel />}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 flex items-center justify-between">
          {title && <p className="text-sm font-medium truncate text-white max-w-[70%]">{title}</p>}
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
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative h-1 hover:h-3 bg-white/20 rounded-full cursor-pointer group/bar transition-all duration-150"
            onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className="absolute h-full bg-white/30 rounded-full" style={{ width: `${duration ? (buffered/duration)*100 : 0}%` }} />
            <div className="absolute h-full bg-primary rounded-full transition-[width]" style={{ width: `${duration ? (currentTime/duration)*100 : 0}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full scale-0 group-hover/bar:scale-100 transition-transform shadow-[0_0_8px_hsl(var(--primary))]" />
            </div>
            {hoverTime !== null && (
              <div className="absolute bottom-6 pointer-events-none -translate-x-1/2 z-30" style={{ left: `${hoverX}px` }}>
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

          {/* Bottom row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2 sm:gap-3">
              {onPrev && <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="hover:text-primary transition-colors p-1"><SkipBack size={18} /></button>}
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="hover:text-primary transition-colors p-1">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              {onNext && <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="hover:text-primary transition-colors p-1"><SkipForward size={18} /></button>}

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-1 group/vol">
                <button onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(!muted); } }} className="hover:text-primary transition-colors p-1">
                  {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                  onClick={e => e.stopPropagation()}
                  onChange={e => { const val = parseFloat(e.target.value); const v = videoRef.current; if (v) { v.volume = val; v.muted = val === 0; } setVolume(val); setMuted(val === 0); }}
                  className="w-0 group-hover/vol:w-20 transition-all accent-primary cursor-pointer" />
              </div>

              <span className="text-xs text-white/60 font-mono hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Playback speed */}
              <select
                value={playbackRate}
                onChange={e => { const r = parseFloat(e.target.value); const v = videoRef.current; if (v) v.playbackRate = r; setPlaybackRate(r); }}
                className="bg-transparent text-xs border border-white/20 rounded px-1.5 py-1 cursor-pointer hover:border-white/50 transition-colors text-white"
                onClick={e => e.stopPropagation()}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                  <option key={r} value={r} className="bg-black">{r}×</option>
                ))}
              </select>

              {/* Settings button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); setSettingsTab("main"); }}
                className={`hover:text-primary transition-colors p-1 ${showSettings ? "text-primary" : ""}`}
                title="Settings"
              >
                <Settings size={17} className={showSettings ? "animate-spin-slow" : ""} />
              </button>

              {/* Cast */}
              <button onClick={(e) => { e.stopPropagation(); handleCast(); }} className="hover:text-primary transition-colors p-1" title="Cast to TV">
                <Cast size={16} />
              </button>

              {/* Fullscreen */}
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hover:text-primary transition-colors p-1">
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
