
"use client";

import React from 'react';
import { Play, MoreVertical, Eye, Clock, Loader2 } from 'lucide-react';
import { VideoMetadata } from '@/lib/sorting';
import Link from 'next/link';
import { useS3Url } from '@/hooks/use-s3-url';

interface VideoCardProps {
  video: VideoMetadata;
}

export default function VideoCard({ video }: VideoCardProps) {
  const formattedViews = video.views > 1000000 
    ? (video.views / 1000000).toFixed(1) + 'M' 
    : (video.views / 1000).toFixed(0) + 'K';

  const uploaderId = (video as any).uploaderId || video.id;
  const s3Key = (video as any).s3Key || (video as any).videoUrl; // Fallback to videoUrl if key not explicit

  // Resolve the URL for the preview (if we want to use B2 for thumbnails or just use the mock ones)
  // For now, let's just use the mock thumbnail provided in the video object
  const thumbnail = video.thumbnail || `https://picsum.photos/seed/${video.id}/600/400`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col group">
      <Link href={`/video/${video.id}`} className="block relative aspect-video overflow-hidden">
        <img 
          src={thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Play size={24} className="text-accent fill-accent translate-x-0.5" />
          </div>
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex gap-3 mb-2">
          <Link href={`/channel/${uploaderId}`} className="flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-white/5 flex items-center justify-center text-[10px] font-bold text-accent hover:bg-accent/10 transition-colors">
              {video.creator[0]}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/video/${video.id}`}>
              <h3 className="font-headline font-bold text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                {video.title}
              </h3>
            </Link>
            <Link href={`/channel/${uploaderId}`} className="text-xs text-muted-foreground mt-1 truncate block hover:text-foreground">
              {video.creator}
            </Link>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center gap-3 text-[10px] text-muted-foreground font-body">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {formattedViews}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> 2 days ago
          </span>
        </div>
      </div>
    </div>
  );
}
