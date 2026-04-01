"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { TrendingUp, Sparkles, Heart, DatabaseZap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ["All", "Entertainment", "Social Life", "Computer Science", "Physics", "Cybersecurity"];

/**
 * AlgoTube Home - SQL Discovery Interface
 * Fetches transmission metadata from the Turso SQL mesh.
 */
export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/videos?category=${selectedCategory}`);
        const data = await res.json();
        setVideos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Turso Mesh Sync Error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedCategory]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="flex items-center gap-2 mb-6 overflow-x-auto py-4 no-scrollbar sticky top-0 bg-background/50 backdrop-blur-md z-20">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full whitespace-nowrap text-xs font-code transition-all border",
                  selectedCategory === cat 
                    ? "bg-accent text-background border-accent shadow-[0_0_15px_rgba(116,222,236,0.3)]" 
                    : "bg-white/5 border-white/10 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[9px] text-accent font-code whitespace-nowrap">
              <DatabaseZap size={10} /> TURSO SQL MESH ACTIVE
            </div>
          </div>

          {selectedCategory === "All" && (
            <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden group min-h-[320px] flex items-center">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                <Heart size={200} className="text-accent fill-accent/20" />
              </div>
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 mb-4 text-accent">
                  <Sparkles size={20} />
                  <span className="font-code text-xs tracking-widest uppercase">Turso DB: Operational</span>
                </div>
                <h1 className="text-5xl font-headline font-bold mb-4 bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent leading-tight">
                  Next Gen <br/>SQL Mesh discovery
                </h1>
                <p className="text-muted-foreground font-body leading-relaxed mb-8 text-lg">
                  Powered by Turso. Ultra-low latency transmission metadata served from the global SQL edge nodes.
                </p>
              </div>
            </div>
          )}

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">
                {selectedCategory === "All" ? "Hot on the Mesh" : `${selectedCategory} Transmissions`}
              </h2>
            </div>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
               <Loader2 className="animate-spin text-accent" size={40} />
               <p className="font-code text-xs tracking-widest uppercase">Querying Turso Nodes...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {videos.length > 0 ? (
                videos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center opacity-30">
                  <p className="font-code text-xs">NO TRANSMISSIONS DETECTED IN SQL REGISTRY</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
