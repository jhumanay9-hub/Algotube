
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
 * Hardened with "Wait for Mesh" guards and the "Key Hack" to prevent race conditions.
 */
const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ videoUrl, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. THE 'WAIT FOR MESH' GUARD:
  // Prevent the video element from mounting if the URL is missing or malformed.
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

  // 2. LOGGING:
  // Confirming the render with a valid URL string.
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
        // 3. THE 'KEY HACK': 
        // Forces React to destroy and recreate the video element when the URL changes.
        key={videoUrl} 
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
        preload="metadata" // 4. METADATA GUARD: Prevents aggressive buffering of invalid sources
        crossOrigin="anonymous"
        onError={(e) => {
          const error = e.currentTarget.error;
          // Only log if we actually have a source we expected to work
          if (videoUrl && videoUrl !== 'undefined') {
            console.error('Mesh Sync Failed:', error?.message || 'Unknown Media Error', `(Code: ${error?.code})`);
          }
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
