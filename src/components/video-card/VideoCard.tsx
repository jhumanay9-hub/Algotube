"use client";

import React from 'react';
import { Play, MoreVertical, Eye, Clock } from 'lucide-react';
import Link from 'next/link';

interface VideoCardProps {
  video: {
    id: number | string;
    title: string;
    description?: string;
    url: string;
    author_name: string;
  };
}

/**
 * VideoCard - Optimized for 4GB RAM
 * Uses the new SQL Schema keys: url, author_name.
 */
export default function VideoCard({ video }: VideoCardProps) {
  // Use a reliable placeholder for thumbnails since they are removed from the schema
  const thumbnail = `https://picsum.photos/seed/${video.id}/600/400`;

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full flex flex-col group animate-in fade-in duration-500">
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
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-white/5 flex items-center justify-center text-[10px] font-bold text-accent">
            {video.author_name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/video/${video.id}`}>
              <h3 className="font-headline font-bold text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                {video.title}
              </h3>
            </Link>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {video.author_name}
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center gap-3 text-[9px] text-muted-foreground font-code uppercase tracking-tighter">
          <span className="flex items-center gap-1">
            <Eye size={10} /> 0 MESH VIEWS
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} /> RECENT SYNC
          </span>
        </div>
      </div>
    </div>
  );
}
