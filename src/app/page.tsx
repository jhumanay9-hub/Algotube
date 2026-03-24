
"use client";

import React, { useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';
import { heapSortTrending } from '@/lib/sorting';
import { TrendingUp, Award, Zap } from 'lucide-react';

export default function Home() {
  const trendingVideos = useMemo(() => heapSortTrending(MOCK_VIDEOS), []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          {/* Hero Trending Section */}
          <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp size={200} className="text-accent" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-4 text-accent">
                <Award size={20} />
                <span className="font-code text-xs tracking-widest uppercase">Protocol Status: Trending</span>
              </div>
              <h1 className="text-5xl font-headline font-bold mb-4 bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent leading-tight">
                Deciphering the <br/>Global Threat Landscape
              </h1>
              <p className="text-muted-foreground font-body leading-relaxed mb-8 text-lg">
                The most impactful security briefings and architectural deep dives, 
                weighted by relevance and real-time community engagement.
              </p>
              <button className="px-8 py-3 rounded-xl bg-accent text-background font-headline font-bold hover:neon-glow transition-all flex items-center gap-2 group">
                <Zap size={18} className="fill-background" />
                DIVE INTO STACK
              </button>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Trending Streams</h2>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-code">Live</button>
              <button className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-xs font-code hover:text-foreground">Recorded</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {trendingVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Zap className="text-accent" size={24} />
            <h2 className="text-xl font-headline font-bold">Recommended for GhostRunner</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {/* Random shuffle for demonstration of recommendations */}
            {[...trendingVideos].reverse().map((video) => (
              <VideoCard key={video.id + '_rec'} video={video} />
            ))}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(116, 222, 236, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(116, 222, 236, 0.2);
        }
      `}</style>
    </div>
  );
}
