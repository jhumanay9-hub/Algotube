
"use client";

import React, { useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Clock, History } from 'lucide-react';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';

export default function HistoryPage() {
  const { firestore } = useFirestore();
  const { user } = useUser();
  
  const historyQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'userProfiles', user.uid, 'history'),
      orderBy('watchedAt', 'desc'),
      limit(100)
    );
  }, [firestore, user]);

  const { data: historyEntries, isLoading } = useCollection(historyQuery);
  const { data: allVideos } = useCollection(useMemoFirebase(() => firestore ? collection(firestore, 'videos') : null, [firestore]));

  const historyVideos = useMemo(() => {
    if (!historyEntries) return [];
    return historyEntries.map(entry => {
      const v = allVideos?.find(av => av.id === entry.videoId);
      return v || MOCK_VIDEOS.find(mv => mv.id === entry.videoId);
    }).filter(Boolean);
  }, [historyEntries, allVideos]);

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

          {!user ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock size={48} className="mb-4 opacity-20" />
              <p>Sign in to track your history on the mesh.</p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {historyVideos.map((video, idx) => (
                <VideoCard key={`${video.id}-${idx}`} video={video as any} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
