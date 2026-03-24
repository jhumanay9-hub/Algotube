
"use client";

import React, { useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { TrendingUp, Flame, Zap } from 'lucide-react';
import { calculateHotScore } from '@/lib/ranking';

export default function TrendingPage() {
  const { firestore } = useFirestore();
  
  const videosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'videos'), limit(50));
  }, [firestore]);

  const { data: videos, isLoading } = useCollection(videosQuery);

  const trendingVideos = useMemo(() => {
    if (!videos) return [];
    return [...videos].sort((a, b) => {
      const scoreA = calculateHotScore(a.likesCount || 0, a.dislikesCount || 0, a.uploadDate || new Date().toISOString());
      const scoreB = calculateHotScore(b.likesCount || 0, b.dislikesCount || 0, b.uploadDate || new Date().toISOString());
      return scoreB - scoreA;
    });
  }, [videos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden flex items-center bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-accent">
                <Flame size={20} className="fill-accent" />
                <span className="font-code text-xs tracking-widest uppercase">Hot on the Mesh</span>
              </div>
              <h1 className="text-4xl font-headline font-bold mb-2">Decay-Weighted Ranking</h1>
              <p className="text-muted-foreground font-body max-w-xl text-sm">
                Real-time algorithmic feed where performance and freshness collide.
              </p>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Trending Transmissions</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {trendingVideos.map((video) => (
                <VideoCard key={video.id} video={video as any} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
