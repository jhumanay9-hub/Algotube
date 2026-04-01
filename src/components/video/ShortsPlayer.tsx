"use client";

import React, { useRef, useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Share2, Music, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ShortsPlayerProps {
  video: {
    id: string | number;
    url: string;
    title: string;
    author_name: string;
    likesCount?: number;
    dislikesCount?: number;
    description?: string;
  };
}

export default function ShortsPlayer({ video }: ShortsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.8 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    if (videoRef.current?.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const thumbnail = `https://picsum.photos/seed/${video.id}/600/1000`;

  return (
    <div 
      ref={containerRef}
      className="h-full w-full flex items-center justify-center snap-start relative bg-black"
    >
      {/* Dynamic Blurred Background */}
      <div 
        className="absolute inset-0 z-0 opacity-30 blur-[100px] pointer-events-none"
        style={{ backgroundImage: `url(${thumbnail})`, backgroundSize: 'cover' }}
      />

      <div className="relative z-10 h-full max-h-[85vh] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          crossOrigin="anonymous"
          preload="metadata"
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Play className="text-white fill-white translate-x-1" size={32} />
            </div>
          </div>
        )}

        {/* Content Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border-2 border-accent">
              <AvatarImage src={`https://picsum.photos/seed/${video.author_name}/100/100`} />
              <AvatarFallback>{video.author_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-headline font-bold text-sm text-white flex items-center gap-2">
                @{video.author_name}
                <Button variant="ghost" className="h-6 px-2 text-[10px] bg-accent text-background font-bold hover:bg-accent/80 rounded-md">
                  SUBSCRIBE
                </Button>
              </h4>
            </div>
          </div>
          
          <p className="text-sm text-white/90 font-body mb-3 line-clamp-2">{video.title}</p>
          
          <div className="flex items-center gap-2 text-xs text-white/60 font-code animate-pulse">
            <Music size={12} className="text-accent" />
            <span>Original Sound - AlgoTube Audio Engine</span>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-accent/20 hover:border-accent/40 transition-all">
              <ThumbsUp className="text-white group-hover/btn:text-accent" size={24} />
            </div>
            <span className="text-[10px] font-bold text-white">{video.likesCount || 0}</span>
          </div>

          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
              <MessageSquare className="text-white" size={24} />
            </div>
            <span className="text-[10px] font-bold text-white">Chat</span>
          </div>

          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
              <Share2 className="text-white" size={24} />
            </div>
            <span className="text-[10px] font-bold text-white">Share</span>
          </div>

          <div className="w-12 h-12 rounded-full border-4 border-white/20 animate-spin-slow overflow-hidden">
             <img src={thumbnail} className="w-full h-full object-cover" alt="" />
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
}
