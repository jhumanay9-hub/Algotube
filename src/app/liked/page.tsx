
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { ThumbsUp, Heart, Loader2 } from 'lucide-react';
import { getB2LikedVideos, getB2Videos } from '@/app/actions/b2-store';

export default function LikedVideosPage() {
  const { user, isUserLoading } = useUser();
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
      const [lIds, vids] = await Promise.all([
        getB2LikedVideos(user.uid),
        getB2Videos()
      ]);
      setLikedIds(lIds);
      setAllVideos(vids);
      setIsLoading(false);
    }
    loadData();
  }, [user]);

  const likedVideos = useMemo(() => {
    return likedIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
  }, [likedIds, allVideos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-6 flex items-center gap-3 mt-4">
            <Heart className="text-accent fill-accent" size={24} />
            <h2 className="text-xl font-headline font-bold">Liked Transmissions</h2>
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ThumbsUp size={48} className="mb-4 opacity-20" />
              <p>Sign in to see your liked transmissions stored in B2.</p>
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
                  <VideoCard key={`${video.id}-${idx}`} video={video as any} />
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
