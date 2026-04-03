"use client";

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { Layout, Clock, Heart, Loader2, ChevronRight, DatabaseZap } from 'lucide-react';
import Link from 'next/link';

export default function LibraryPage() {
  const [allVideos, setAllVideos] = useState<any[]>([]);
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
        
        setAllVideos(mappedData);
      } catch (e) {
        console.error('MySQL Sync failed for Library.');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const historyVideos = allVideos.slice(0, 4);
  const likedVideos = allVideos.slice(4, 8);

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
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
              <DatabaseZap size={12} /> MYSQL ACTIVE
            </div>
          </div>

          {isLoading ? (
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
                    <p className="text-sm text-muted-foreground font-body">No recent transmissions on MySQL.</p>
                  </div>
                )}
              </section>

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
