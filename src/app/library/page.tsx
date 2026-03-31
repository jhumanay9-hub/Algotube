
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { Layout, Clock, Heart, Loader2, ChevronRight, DatabaseZap } from 'lucide-react';
import { getB2History, getB2LikedVideos, getB2Videos } from '@/app/actions/b2-store';
import Link from 'next/link';

/**
 * LibraryPage
 * 
 * Consolidates user-specific metadata from the B2 Social Mesh.
 * Shows recent history and liked transmissions in a unified view.
 */
export default function LibraryPage() {
  const { user, isUserLoading } = useUser();
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [hIds, lIds, vids] = await Promise.all([
          getB2History(user.uid),
          getB2LikedVideos(user.uid),
          getB2Videos()
        ]);
        setHistoryIds(hIds);
        setLikedIds(lIds);
        setAllVideos(vids);
      } catch (e) {
        console.error('B2 Mesh Sync failed for Library.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const historyVideos = useMemo(() => {
    return historyIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean).slice(0, 4);
  }, [historyIds, allVideos]);

  const likedVideos = useMemo(() => {
    return likedIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean).slice(0, 4);
  }, [likedIds, allVideos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-8 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Layout className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Your Library</h2>
            </div>
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <DatabaseZap size={12} /> B2 MESH PERSISTENCE
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Layout size={40} className="text-white/20" />
              </div>
              <h3 className="text-xl font-headline font-bold text-white mb-2">Build your collection</h3>
              <p className="max-w-xs mb-8">Sign in to track your history and liked transmissions on the B2 mesh.</p>
              <Link href="/auth">
                <button className="px-8 py-3 rounded-xl bg-accent text-background font-headline font-bold hover:neon-glow transition-all">
                  SIGN IN
                </button>
              </Link>
            </div>
          ) : isLoading || isUserLoading ? (
            <div className="space-y-12">
               {[1, 2].map(section => (
                 <div key={section} className="space-y-4">
                    <div className="h-6 w-32 bg-white/5 rounded animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[1, 2, 3, 4].map(i => <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />)}
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="space-y-12 mb-12 animate-in slide-in-from-bottom-4 duration-500">
              {/* History Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <Link href="/history" className="flex items-center gap-2 group">
                    <Clock size={20} className="text-muted-foreground group-hover:text-accent" />
                    <h3 className="font-headline font-bold text-lg group-hover:text-accent transition-colors">Recent History</h3>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-accent" />
                  </Link>
                  <Link href="/history" className="text-xs font-code text-accent hover:underline">View All</Link>
                </div>
                {historyVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {historyVideos.map((video) => (
                      <VideoCard key={`hist-${video.id}`} video={video as any} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 glass-panel rounded-3xl text-center border-dashed border-white/5 opacity-50">
                    <p className="text-sm text-muted-foreground font-body">No recent transmissions on the B2 mesh.</p>
                  </div>
                )}
              </section>

              {/* Liked Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <Link href="/liked" className="flex items-center gap-2 group">
                    <Heart size={20} className="text-muted-foreground group-hover:text-accent" />
                    <h3 className="font-headline font-bold text-lg group-hover:text-accent transition-colors">Liked Transmissions</h3>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-accent" />
                  </Link>
                  <Link href="/liked" className="text-xs font-code text-accent hover:underline">View All</Link>
                </div>
                {likedVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {likedVideos.map((video) => (
                      <VideoCard key={`like-${video.id}`} video={video as any} />
                    ))}
                  </div>
                ) : (
                  <div className="p-12 glass-panel rounded-3xl text-center border-dashed border-white/5 opacity-50">
                    <p className="text-sm text-muted-foreground font-body">Your liked transmission manifest is empty.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
