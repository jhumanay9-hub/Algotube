"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { Clock, History, Loader2, DatabaseZap } from 'lucide-react';

export default function HistoryPage() {
  const [historyVideos, setHistoryVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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
        
        // For now, just show all local videos as history as a placeholder
        setHistoryVideos(mappedData);
      } catch (e) {
        console.error('Local API Sync Failure');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
              <DatabaseZap size={12} /> MYSQL DB ACTIVE
            </div>
          </div>

          {isLoading ? (
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
                  <p className="font-code text-xs uppercase">No history detected in MySQL</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
