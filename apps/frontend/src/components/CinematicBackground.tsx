import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

const HLS_SRC =
  'https://stream.mux.com/tLkHO1qZoaaQOUeVWo8hEBeGQfySP02EPS02BmnNFyXys.m3u8';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(HLS_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_SRC;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover opacity-60"
    />
  );
}

export function GridLines() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden lg:block z-[2]">
      {[25, 50, 75].map((pos) => (
        <div
          key={pos}
          className="absolute top-0 bottom-0 w-px bg-white/[0.07]"
          style={{ left: `${pos}%` }}
        />
      ))}
    </div>
  );
}

export function AtmosphericGlow() {
  return (
    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 pointer-events-none z-[2]">
      <svg
        width="900"
        height="400"
        viewBox="0 0 900 400"
        fill="none"
        className="opacity-50"
        style={{ filter: 'blur(25px)' }}
      >
        <ellipse cx="450" cy="200" rx="400" ry="150" fill="url(#glow-gradient)" />
        <defs>
          <radialGradient id="glow-gradient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#064e3b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#070b0a" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

export function CinematicBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b0a] flex flex-col">
      {/* Video */}
      <HeroVideo />

      {/* Gradient Overlays */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(to right, #070b0a, transparent)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background:
            'linear-gradient(to top, #070b0a 0%, rgba(7,11,10,0.6) 30%, transparent 60%)',
        }}
      />

      {/* Grid Lines */}
      <GridLines />

      {/* Atmospheric Glow */}
      <AtmosphericGlow />

      {/* Content wrapper */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
