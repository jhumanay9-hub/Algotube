"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { Layers, Users, Loader2, BellRing, DatabaseZap } from 'lucide-react';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const [subscribedVideos, setSubscribedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncData() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/get_videos.php`);
        const data = await res.json();
        
        // Map PHP schema to expected VideoCard schema
        const mappedData = Array.isArray(data) ? data.map(v => ({
          ...v,
          url: v.file_path,
          author_name: 'Local Upload',
          description: `Uploaded on ${v.upload_date}`
        })) : [];
        
        // Render local videos as placeholder
        setSubscribedVideos(mappedData);
      } catch (e) {
        console.error('MySQL Sync failed.');
      } finally {
        setIsLoading(false);
      }
    }
    syncData();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-6 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Layers className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">Your Subscriptions</h2>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
              <DatabaseZap size={12} /> MYSQL DB ACTIVE
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-code text-xs tracking-widest text-accent uppercase">Resolving Local MySQL...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-bottom-4 duration-500">
              {subscribedVideos.length > 0 ? (
                subscribedVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))
              ) : (
                <div className="col-span-full p-12 glass-panel rounded-3xl text-center border-dashed border-white/5 opacity-50">
                  <p className="text-muted-foreground font-body">No recent transmissions from your linked creators.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
