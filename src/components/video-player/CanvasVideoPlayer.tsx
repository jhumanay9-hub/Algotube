
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
 * Hardened with "Safety Guards" to prevent race conditions and handle SQL Mesh synchronization.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ videoUrl, externalState }, ref) => {
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
        // Autoplay may be blocked by browser policy
      });
    }
  }, [externalState, videoUrl]);

  // Expose playback state to parent
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false
  }));

  // GUARD 1: The "Wait for Mesh" Guard
  // Returns a skeleton until a valid URL is delivered from Turso.
  if (!videoUrl || videoUrl === 'undefined' || videoUrl === '') {
    return (
      <div className="aspect-video bg-white/5 animate-pulse rounded-3xl border border-white/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="animate-spin text-accent" size={32} />
          <p className="font-code text-[10px] text-accent uppercase tracking-widest">Initializing Mesh...</p>
        </div>
      </div>
    );
  }

  // Diagnostic Log: Confirm the Mesh has delivered a valid string
  console.log('Rendering Player with URL:', videoUrl);

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
      <video
        // GUARD 2: The "Key Hack"
        // Forces React to recreate the video tag when the URL changes from empty to real.
        key={videoUrl} 
        ref={videoRef}
        className="w-full h-full rounded-lg"
        controls
        autoPlay
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onError={(e) => {
          if (videoUrl && videoUrl !== 'undefined') {
            console.error('Mesh Sync Failed:', e.currentTarget.error?.message, `(Code: ${e.currentTarget.error?.code})`);
          }
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
