"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { Clock, History, Loader2, DatabaseZap } from 'lucide-react';
import { getTursoVideos } from '@/app/actions/turso-actions';

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
      try {
        const [hRes, vids] = await Promise.all([
          fetch(`/api/history?userId=${user.uid}`).then(r => r.json()),
          getTursoVideos()
        ]);
        setHistoryIds(hRes || []);
        setAllVideos(vids);
      } catch (e) {
        console.error('Turso History Sync Failure');
      } finally {
        setIsLoading(false);
      }
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
          <div className="mb-6 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <History className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Watch History</h2>
            </div>
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <DatabaseZap size={12} /> TURSO SQL ACTIVE
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
              <Clock size={48} className="mb-4 opacity-20" />
              <p className="max-w-xs">Sign in to track your playback history on the SQL mesh.</p>
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
                <div className="col-span-full py-24 glass-panel rounded-3xl border-dashed border-white/5 text-center opacity-30">
                  <p className="font-code text-xs uppercase">No history transmissions detected in SQL Mesh</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
