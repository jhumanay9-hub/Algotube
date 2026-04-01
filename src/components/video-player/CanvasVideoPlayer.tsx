
"use client";

import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface CanvasVideoPlayerProps {
  videoUrl: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

/**
 * CanvasVideoPlayer - Standard HTML5 Implementation
 * Hardened with explicit <source> tags to resolve "Format Error" (Code 4).
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ videoUrl, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guard: Return a loading pulse until a valid URL is confirmed.
  if (!videoUrl || videoUrl === 'undefined' || videoUrl.length < 10) {
    return (
      <div className="aspect-video bg-black/40 animate-pulse rounded-3xl border border-white/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-accent" size={32} />
          <p className="font-code text-[10px] text-accent uppercase tracking-widest">Awaiting Registry...</p>
        </div>
      </div>
    );
  }

  // Expose playback state to parent systems
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false,
    seekTo: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    }
  }));

  // Sync with external state (Watch Party / SQL Mesh Sync)
  React.useEffect(() => {
    if (!videoRef.current || !externalState) return;
    
    const targetTime = externalState.currentTime;
    if (isFinite(targetTime) && Math.abs(videoRef.current.currentTime - targetTime) > 1.5) {
      videoRef.current.currentTime = targetTime;
    }

    if (externalState.isPaused && !videoRef.current.paused) {
      videoRef.current.pause();
    } else if (!externalState.isPaused && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [externalState, videoUrl]);

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
      <video
        key={videoUrl} // THE KEY HACK: Forces React to re-mount when URL arrives
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onError={(e) => {
          const error = e.currentTarget.error;
          // Diagnostic Logging: Helps pinpoint Code 4 interruptions
          if (videoUrl && videoUrl !== 'undefined') {
            console.error('Mesh Sync Failed:', error?.message || 'Format Error', `(Code: ${error?.code})`);
          }
        }}
      >
        {/* EXPLICIT MIME TYPE: Mandatory for resolving Source Not Supported errors */}
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Playback Indicator */}
      <div className="absolute top-4 right-4 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="px-2 py-1 rounded bg-black/60 border border-white/10 text-[8px] font-code text-accent uppercase">
          MP4 STREAM ACTIVE
        </div>
      </div>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
