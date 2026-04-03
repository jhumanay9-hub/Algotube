"use client";

import React from 'react';
import { Play, MoreVertical, ThumbsUp, ThumbsDown } from 'lucide-react';
import Link from 'next/link';

interface VideoCardProps {
  video: {
    id: number | string;
    title: string;
    description?: string;
    url: string;
    author_name: string;
    likes?: number;
    dislikes?: number;
  };
}

const VideoCard = React.memo(({ video }: VideoCardProps) => {
  // Random seed for thumbnail consistency
  const thumbnail = `https://picsum.photos/seed/${video.id}/600/400`;

  // Only attempt to ping the detail API if the ID is valid
  const handleMouseEnter = () => {
    if (video.id) {
      fetch(`/api/video_detail.php?id=${video.id}`).catch(() => {
        // Silently fail to avoid console clutter on server-side hiccups
      });
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col group animate-in fade-in duration-500">
      
      {/* FIXED: Using Link with 'prefetch={false}' is safer for Static Exports on InfinityFree.
        It prevents the background 404 errors you saw in your logs.
      */}
      <Link 
        href={`/video/${video.id}`}
        prefetch={false} 
        onMouseEnter={handleMouseEnter}
        className="block relative aspect-video overflow-hidden cursor-pointer"
      >
        <img 
          src={thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Play size={24} className="text-accent fill-accent translate-x-0.5" />
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-white/5 flex items-center justify-center text-[10px] font-bold text-accent">
            {video.author_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            {/* FIXED: Using Link here as well to maintain SPA behavior */}
            <Link href={`/video/${video.id}`} prefetch={false}>
              <h3 className="font-headline font-bold text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-tight cursor-pointer">
                {video.title}
              </h3>
            </Link>
            <p className="text-[10px] text-muted-foreground mt-1 truncate font-body">
              {video.author_name}
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center gap-4 text-[9px] text-muted-foreground font-code uppercase tracking-tighter">
          <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            <ThumbsUp size={10} className="text-accent" /> {video.likes || 0}
          </span>
          <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            <ThumbsDown size={10} className="text-red-500" /> {video.dislikes || 0}
          </span>
          <span className="ml-auto opacity-50">SYNCED</span>
        </div>
      </div>
    </div>
  );
});

VideoCard.displayName = 'VideoCard';
export default VideoCard;