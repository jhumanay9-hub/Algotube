"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface CanvasVideoPlayerProps {
  src: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

/**
 * CanvasVideoPlayer - Standard HTML5 Implementation
 * Refactored to remove all Canvas logic and provide a robust loading guard.
 * Features strict CORS handling and source validation.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ src, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Guard against 'undefined' string or null/empty sources
  const isValidSrc = src && src !== "undefined" && src.trim() !== "";

  // Sync with external state (Watch Party / SQL Mesh Sync)
  useEffect(() => {
    if (!videoRef.current || !externalState || !isValidSrc) return;
    
    const targetTime = externalState.currentTime;
    
    // Sync time if drift is significant (> 1.5 seconds)
    if (isFinite(targetTime) && Math.abs(videoRef.current.currentTime - targetTime) > 1.5) {
      videoRef.current.currentTime = targetTime;
    }

    // Sync play/pause state
    if (externalState.isPaused && !videoRef.current.paused) {
      videoRef.current.pause();
    } else if (!externalState.isPaused && videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked by browser policy
      });
    }
  }, [externalState, isValidSrc]);

  // Expose playback state to parent (ConversationPanel/WatchParty)
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false
  }));

  if (!isValidSrc) {
    return (
      <div className="relative aspect-video bg-black/40 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center gap-4 border border-white/5 overflow-hidden shadow-2xl">
        <Loader2 className="animate-spin text-accent" size={32} />
        <div className="text-[10px] font-code text-accent uppercase tracking-widest animate-pulse">
          Resolving SQL Transmission...
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg"
        controls
        autoPlay
        playsInline
        preload="metadata"
        crossOrigin="anonymous" // Essential for cross-origin media handshake
        onError={(e) => {
          console.error('SQL Sync Failed:', e.currentTarget.error?.message, `(Code: ${e.currentTarget.error?.code})`);
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
