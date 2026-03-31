
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { Clock, History, Loader2 } from 'lucide-react';
import { getB2History, getB2Videos } from '@/app/actions/b2-store';

export default function HistoryPage() {
  const { user, isUserLoading } = useUser();
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [hIds, vids] = await Promise.all([
        getB2History(user.uid),
        getB2Videos()
      ]);
      setHistoryIds(hIds);
      setAllVideos(vids);
      setIsLoading(false);
    }
    loadData();
  }, [user]);

  const historyVideos = useMemo(() => {
    return historyIds.map(id => allVideos.find(v => v.id === id)).filter(Boolean);
  }, [historyIds, allVideos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-6 flex items-center gap-3 mt-4">
            <History className="text-accent" size={24} />
            <h2 className="text-xl font-headline font-bold">Watch History</h2>
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock size={48} className="mb-4 opacity-20" />
              <p>Sign in to track your history on the B2 mesh.</p>
            </div>
          ) : isLoading || isUserLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {historyVideos.length > 0 ? (
                historyVideos.map((video, idx) => (
                  <VideoCard key={`${video.id}-${idx}`} video={video as any} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center opacity-30">
                  <p className="font-code text-xs uppercase">No history records found in B2</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
