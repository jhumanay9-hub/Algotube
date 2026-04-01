
"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface CanvasVideoPlayerProps {
  videoUrl: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

/**
 * CanvasVideoPlayer - Standard HTML5 Implementation
 * Hardened to prevent race conditions and handle SQL Mesh synchronization.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ videoUrl, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Prop Check: Immediately return null if videoUrl is missing to prevent 'undefined' errors
  if (!videoUrl || videoUrl === 'undefined') {
    return null;
  }

  // Diagnostic Log: Confirm the Mesh has delivered a valid string
  console.log('Rendering Player with URL:', videoUrl);

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

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5 group">
      <video
        key={videoUrl} // FORCE RE-INITIALIZATION: Only when a valid URL is delivered from the Mesh
        ref={videoRef}
        className="w-full h-full rounded-lg"
        controls
        autoPlay
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onError={(e) => {
          // Only log if we actually have a URL to load
          if (videoUrl && videoUrl !== 'undefined') {
            console.error('Mesh Sync Failed:', e.currentTarget.error?.message, `(Code: ${e.currentTarget.error?.code})`);
          }
        }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
