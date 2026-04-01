
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface CanvasVideoPlayerProps {
  src: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

/**
 * CanvasVideoPlayer - Standard HTML5 Refactor
 * Simplified to resolve persistent CORS Code 4 errors by removing canvas drawing.
 * Retains Watch Party synchronization and CORS headers for stability.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ src, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync with external state (Watch Party / SQL Mesh Sync)
  useEffect(() => {
    if (!videoRef.current || !externalState) return;
    
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
        // Autoplay may be blocked if not muted
      });
    }
  }, [externalState]);

  // Expose playback state to parent (ConversationPanel/WatchParty)
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false
  }));

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      <video
        ref={videoRef}
        {...(src ? { src } : {})}
        className="w-full h-full rounded-lg shadow-xl"
        controls
        autoPlay
        playsInline
        preload="auto"
        crossOrigin="anonymous" // Essential for cross-origin media handshake
        onError={(e) => {
          // Log specific browser error for SQL Mesh diagnostics
          console.error('Mesh Sync Failed:', e.currentTarget.error?.message);
        }}
      />
      
      {/* Loading Overlay if Source is Missing */}
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="text-[10px] font-code text-accent uppercase tracking-widest animate-pulse">
            Awaiting Registry Data...
          </div>
        </div>
      )}
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
