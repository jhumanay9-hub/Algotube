"use client";

import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface CanvasVideoPlayerProps {
  videoUrl: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: (currentTime: number) => void;
}

/**
 * Convert database path to absolute URL for video playback
 * DB stores: /Algotube/uploads/videos/file.mp4
 * Browser needs: http://localhost/Algotube/uploads/videos/file.mp4
 */
const getMediaUrl = (path: string | null): string => {
  if (!path) return "";
  // Already absolute URL
  if (path.startsWith("http")) return path;

  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;

  // Build absolute URL to XAMPP localhost
  return `http://localhost/${cleanPath}`;
};

/**
 * CanvasVideoPlayer - Standard HTML5 Implementation
 * Hardened with explicit <source> tags and error guards.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(
  ({ videoUrl, externalState, onPlay, onPause, onSeeked }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);

    // Expose playback state to parent systems
    useImperativeHandle(ref, () => ({
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getIsPaused: () => videoRef.current?.paused || false,
      seekTo: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
    }));

    // Sync with external state (Watch Party / SQL Mesh Sync)
    React.useEffect(() => {
      if (!videoRef.current || !externalState) return;

      const targetTime = externalState.currentTime;
      if (
        isFinite(targetTime) &&
        Math.abs(videoRef.current.currentTime - targetTime) > 1.5
      ) {
        videoRef.current.currentTime = targetTime;
      }

      if (externalState.isPaused && !videoRef.current.paused) {
        videoRef.current.pause();
      } else if (!externalState.isPaused && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }, [externalState, videoUrl]);

    // Guard: Return a loading pulse until a valid URL is confirmed.
    if (!videoUrl || videoUrl === "undefined" || videoUrl.length < 10) {
      return (
        <div className="aspect-video bg-black/40 animate-pulse rounded-3xl border border-white/5 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-accent" size={32} />
            <p className="font-code text-[10px] text-accent uppercase tracking-widest">
              Awaiting Registry...
            </p>
          </div>
        </div>
      );
    }

    // Guard: Video Not Found Placeholder
    if (hasError) {
      return (
        <div className="aspect-video bg-black rounded-3xl border border-red-500/20 flex flex-col items-center justify-center gap-4 text-center p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <div>
            <h3 className="text-white font-headline font-bold uppercase tracking-widest text-sm mb-2">
              Video Not Found
            </h3>
            <p className="text-[10px] text-muted-foreground font-code max-w-xs">
              The requested media asset could not be retrieved from the local
              server registry (404).
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
        <video
          key={videoUrl}
          ref={videoRef}
          className="w-full h-full"
          controls
          autoPlay
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onPlay={() => onPlay?.()}
          onPause={() => onPause?.()}
          onSeeked={() => onSeeked?.(videoRef.current?.currentTime || 0)}
          onError={() => setHasError(true)}
        >
          <source src={getMediaUrl(videoUrl)} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Playback Indicator */}
        <div className="absolute top-4 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="px-2 py-1 rounded bg-black/60 border border-white/10 text-[8px] font-code text-accent uppercase">
            NATIVE STREAM ACTIVE
          </div>
        </div>
      </div>
    );
  },
);

CanvasVideoPlayer.displayName = "CanvasVideoPlayer";
export default CanvasVideoPlayer;
