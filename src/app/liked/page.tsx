"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { ThumbsUp, Heart, Loader2, DatabaseZap } from 'lucide-react';

export default function LikedVideosPage() {
  const { user, isUserLoading } = useUser();
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch liked IDs from SQL interaction mesh
        const lRes = await fetch(`/api/likes?userId=${user.uid}`);
        const likedIds = await lRes.json();
        
        // Fetch all videos to filter (Optimization: Ideally we have an api/videos/liked route)
        const vRes = await fetch(`/api/videos?limit=100`);
        const allVideos = await vRes.json();
        
        const filtered = Array.isArray(allVideos) ? allVideos.filter((v: any) => likedIds.includes(Number(v.id))) : [];
        setLikedVideos(filtered);
      } catch (e) {
        console.error('Liked Mesh Sync Failure');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-6 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Heart className="text-accent fill-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Liked Transmissions</h2>
            </div>
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <DatabaseZap size={12} /> TURSO SQL REGISTRY
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
              <ThumbsUp size={48} className="mb-4 opacity-20" />
              <p className="max-w-xs">Sign in to see your liked transmissions stored on the SQL mesh.</p>
            </div>
          ) : isLoading || isUserLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {likedVideos.length > 0 ? (
                likedVideos.map((video, idx) => (
                  <VideoCard key={`${video.id}-${idx}`} video={video} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center opacity-30">
                  <p className="font-code text-xs uppercase">Your liked transmission manifest is empty</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
