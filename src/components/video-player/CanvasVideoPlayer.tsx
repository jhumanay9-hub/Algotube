
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface CanvasVideoPlayerProps {
  videoUrl: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

/**
 * CanvasVideoPlayer - Standard HTML5 Implementation
 * Hardened with MIME-type hinting and aggressive source validation to resolve Code 4 errors.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ videoUrl, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Guard: Prevent mount if URL is missing or malformed.
  if (!videoUrl || videoUrl === 'undefined' || videoUrl.length < 10) {
    return (
      <div className="aspect-video bg-black/40 animate-pulse rounded-3xl border border-white/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-accent" size={32} />
          <p className="font-code text-[10px] text-accent uppercase tracking-widest">Resolving Registry...</p>
        </div>
      </div>
    );
  }

  // Sync with external state (Watch Party / SQL Mesh Sync)
  useEffect(() => {
    if (!videoRef.current || !externalState) return;
    
    const targetTime = externalState.currentTime;
    
    // Sync time if drift is significant
    if (isFinite(targetTime) && Math.abs(videoRef.current.currentTime - targetTime) > 1.5) {
      videoRef.current.currentTime = targetTime;
    }

    // Sync play/pause state
    if (externalState.isPaused && !videoRef.current.paused) {
      videoRef.current.pause();
    } else if (!externalState.isPaused && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [externalState, videoUrl]);

  // Expose playback state to parent
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false
  }));

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
        onError={(e) => {
          const error = e.currentTarget.error;
          if (videoUrl && videoUrl !== 'undefined') {
            console.error('Mesh Sync Failed:', error?.message || 'Format Error', `(Code: ${error?.code})`);
          }
        }}
      >
        {/* Source Hinting: Assist pre-loader in identifying valid MP4 transmissions */}
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
