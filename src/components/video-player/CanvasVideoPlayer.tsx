"use client";

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface CanvasVideoPlayerProps {
  src: string | null;
  poster?: string;
  externalState?: { currentTime: number; isPaused: boolean };
}

const CanvasVideoPlayer = forwardRef<any, CanvasVideoPlayerProps>(({ src, externalState }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('1080p');

  // Sync with external state (Watch Party)
  useEffect(() => {
    if (!videoRef.current || !externalState) return;
    
    const targetTime = externalState.currentTime;
    
    // Safety check for finite value
    if (isFinite(targetTime) && Math.abs(videoRef.current.currentTime - targetTime) > 1) {
      videoRef.current.currentTime = targetTime;
    }

    if (externalState.isPaused && !videoRef.current.paused) {
      videoRef.current.pause();
    } else if (!externalState.isPaused && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    }
  }, [externalState]);

  useImperativeHandle(ref, () => ({
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getIsPaused: () => videoRef.current?.paused || false
  }));

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(116, 222, 236, 0.1)';
        ctx.font = '12px "Space Grotesk"';
        ctx.fillText(`Stream: ${quality} | SQL-Sync Active`, 20, 30);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        for (let i = 0; i < canvas.height; i += 4) {
          ctx.fillRect(0, i, canvas.width, 1);
        }
      }
      animationId = requestAnimationFrame(drawFrame);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      drawFrame();
    };

    const handlePause = () => setIsPlaying(false);
    
    const handleTimeUpdate = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      cancelAnimationFrame(animationId);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [quality]);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
    } else {
      videoRef.current?.pause();
    }
  };

  const handleProgressChange = (val: number[]) => {
    if (videoRef.current && isFinite(videoRef.current.duration) && videoRef.current.duration > 0) {
      const newTime = (val[0] / 100) * videoRef.current.duration;
      if (isFinite(newTime)) {
        videoRef.current.currentTime = newTime;
        setProgress(val[0]);
      }
    }
  };

  return (
    <div 
      className="relative group aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-white/10"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src || undefined}
        className="hidden"
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
      />
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        className="w-full h-full cursor-pointer"
        onClick={togglePlay}
      />

      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-4">
          <Slider 
            value={[progress]} 
            max={100} 
            step={0.1} 
            onValueChange={handleProgressChange}
            className="w-full cursor-pointer"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button size="icon" variant="ghost" onClick={togglePlay} className="text-white hover:text-accent">
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </Button>
              <div className="flex items-center gap-2 group/volume">
                <Button size="icon" variant="ghost" onClick={() => setIsMuted(!isMuted)} className="text-white hover:text-accent">
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </Button>
                <Slider 
                  value={[isMuted ? 0 : volume]} 
                  max={100} 
                  onValueChange={(v) => setVolume(v[0])}
                  className="w-24 opacity-0 group-hover/volume:opacity-100 transition-opacity"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white font-code text-xs">
                {quality}
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:text-accent">
                <Settings size={20} />
              </Button>
              <Button size="icon" variant="ghost" className="text-white hover:text-accent">
                <Maximize size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {!isPlaying && (!videoRef.current || !videoRef.current.currentTime) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center neon-glow">
            <Play size={40} className="text-accent fill-accent translate-x-1" />
          </div>
        </div>
      )}
    </div>
  );
});

CanvasVideoPlayer.displayName = 'CanvasVideoPlayer';
export default CanvasVideoPlayer;
