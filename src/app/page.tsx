
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';
import { heapSortTrending } from '@/lib/sorting';
import { TrendingUp, Sparkles, Zap, Video, Filter } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const CATEGORIES = ["All", "Cybersecurity", "Social Life", "Computer Science", "Physics"];

/**
 * Fisher-Yates Shuffle Algorithm for mixing results
 */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { user } = useUser();
  const { firestore } = useFirestore();

  const videosQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (selectedCategory === "All") return query(collection(firestore, 'videos'), limit(50));
    return query(collection(firestore, 'videos'), where('category', '==', selectedCategory), limit(50));
  }, [firestore, selectedCategory]);

  const { data: firestoreVideos, isLoading } = useCollection(videosQuery);

  const displayVideos = useMemo(() => {
    const baseVideos = [...(firestoreVideos || []), ...MOCK_VIDEOS];
    
    if (selectedCategory === "All") {
      // Fisher-Yates shuffle the first batch for diversity
      return shuffle(baseVideos).slice(0, 24);
    }
    
    return baseVideos.filter(v => 
      v.category === selectedCategory || 
      (v as any).tags?.some((t: string) => t.toLowerCase() === selectedCategory.toLowerCase())
    );
  }, [firestoreVideos, selectedCategory]);

  const trendingVideos = useMemo(() => heapSortTrending(displayVideos as any), [displayVideos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          {/* Category Filter Bar */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto py-4 scrollbar-hide no-scrollbar">
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
          </div>

          {/* Hero Section - Only show on All */}
          {selectedCategory === "All" && (
            <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden group min-h-[320px] flex items-center">
              <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
                <Video size={200} className="text-accent" />
              </div>
              
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 mb-4 text-accent">
                  <Sparkles size={20} />
                  <span className="font-code text-xs tracking-widest uppercase">Community Choice: Global Feed</span>
                </div>
                <h1 className="text-5xl font-headline font-bold mb-4 bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent leading-tight">
                  Discover the Next <br/>Big Story in Tech
                </h1>
                <p className="text-muted-foreground font-body leading-relaxed mb-8 text-lg">
                  Join thousands of creators sharing their insights and building the future 
                  of decentralized streaming together.
                </p>
                <button className="px-8 py-3 rounded-xl bg-accent text-background font-headline font-bold hover:neon-glow transition-all flex items-center gap-2 group">
                  <Zap size={18} className="fill-background" />
                  EXPLORE NOW
                </button>
              </div>
            </div>
          )}

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">{selectedCategory === "All" ? "Trending Now" : `${selectedCategory} Spotlight`}</h2>
            </div>
          </div>

          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
               {[1,2,3,4,5,6,7,8].map(i => (
                 <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse border border-white/5" />
               ))}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {trendingVideos.map((video) => (
                <VideoCard key={video.id} video={video as any} />
              ))}
            </div>
          )}

          {user && selectedCategory === "All" && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <Sparkles className="text-accent" size={24} />
                <h2 className="text-xl font-headline font-bold">Recommended for {user.displayName || "You"}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {[...trendingVideos].reverse().slice(0, 4).map((video) => (
                  <VideoCard key={video.id + '_rec'} video={video as any} />
                ))}
              </div>
            </>
          )}
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
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
