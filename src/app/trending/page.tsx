
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { TrendingUp, Flame, Loader2, ChevronDown, DatabaseZap, Sparkles } from 'lucide-react';
import { calculateHotScore } from '@/lib/ranking';
import { getB2Videos } from '@/app/actions/b2-store';
import { Button } from '@/components/ui/button';

const PAGE_SIZE = 10;

/**
 * TrendingPage
 * 
 * Implements a Hacker News-style Time-Decay Ranking Algorithm.
 * Fetches registry from B2 mesh and calculates gravity-weighted scores.
 */
export default function TrendingPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getB2Videos();
        setVideos(data);
      } catch (e) {
        console.error('Failed to sync B2 registry for Trending.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Algorithm & Filtering
  const trendingVideos = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    return [...videos]
      .filter(v => {
        const time = new Date(v.uploadDate || v.uploadedAt || Date.now()).getTime();
        return time > oneWeekAgo; // Filter for videos uploaded in the last 7 days
      })
      .map(v => ({
        ...v,
        trendingScore: calculateHotScore(
          v.views || v.viewsCount || 0, 
          v.likesCount || 0, 
          v.uploadDate || v.uploadedAt || Date.now()
        )
      }))
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }, [videos]);

  const pagedVideos = useMemo(() => {
    return trendingVideos.slice(0, visibleCount);
  }, [trendingVideos, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          {/* Hacker-News Gravity Hero Section */}
          <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden flex items-center bg-gradient-to-r from-accent/10 to-transparent border-l-4 border-accent mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
              <Flame size={300} className="text-accent fill-accent" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-accent">
                <Sparkles size={16} />
                <span className="font-code text-[10px] tracking-[0.2em] uppercase font-bold">Time-Decay Ranking V2.0</span>
              </div>
              <h1 className="text-4xl font-headline font-bold mb-2">Transmission Gravity</h1>
              <p className="text-muted-foreground font-body max-w-xl text-sm leading-relaxed">
                Algorithmic feed powered by B2 Persistence. Videos are weighted by engagement velocity and age decay to ensure the mesh stays fresh.
              </p>
              <div className="mt-6 flex items-center gap-2 px-3 py-1.5 w-fit rounded-lg bg-accent/5 border border-accent/20 text-[9px] text-accent font-code">
                <DatabaseZap size={12} /> B2 MESH REGISTRY SYNCED
              </div>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Trending Transmissions</h2>
            </div>
            <div className="text-[10px] font-code text-muted-foreground uppercase tracking-widest">
              Last 7 Days • Sorted by Score
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-12 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pagedVideos.length > 0 ? (
                  pagedVideos.map((video, idx) => (
                    <div key={video.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                      <VideoCard video={video as any} />
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-24 glass-panel rounded-3xl border-dashed border-white/5 text-center opacity-30">
                    <p className="font-headline font-bold uppercase tracking-[0.3em]">No fresh transmissions detected</p>
                  </div>
                )}
              </div>

              {visibleCount < trendingVideos.length && (
                <div className="flex justify-center pt-8">
                  <Button 
                    variant="ghost" 
                    onClick={handleLoadMore}
                    className="group flex flex-col items-center gap-2 h-auto py-6 px-12 rounded-3xl border border-white/5 hover:bg-accent/5 hover:border-accent/20 transition-all"
                  >
                    <span className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground group-hover:text-accent">Load More Transmissions</span>
                    <ChevronDown className="text-muted-foreground group-hover:text-accent animate-bounce" size={20} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
