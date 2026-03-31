
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ShortsPlayer from '@/components/video/ShortsPlayer';
import { Zap, Loader2, Plus, RefreshCw, DatabaseZap } from 'lucide-react';
import { getB2Videos } from '@/app/actions/b2-store';
import { UploadModal } from '@/components/video/UploadModal';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ShortsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user } = useUser();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getB2Videos();
      setVideos(data);
    } catch (e) {
      console.error('B2 Mesh Sync failed for Shorts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const shorts = useMemo(() => {
    // Filter for vertical content or content explicitly tagged as 'short'
    return videos.filter(v => 
      v.aspectRatio === '9:16' || 
      v.category === 'Shorts' || 
      (v as any).tags?.some((t: string) => t.toLowerCase() === 'short')
    );
  }, [videos]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        <main className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth relative">
          {/* Floating Shorts Toolbar */}
          <div className="fixed right-8 top-24 z-40 flex flex-col gap-4">
            {user && (
              <Button 
                onClick={() => setIsUploadOpen(true)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center group p-0 border-0"
                title="Broadcast Short"
              >
                <Plus size={28} className="text-white group-hover:rotate-90 transition-transform duration-300" />
              </Button>
            )}
            <Button 
              onClick={loadData}
              variant="ghost"
              className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white p-0"
              title="Sync Mesh"
            >
              <RefreshCw size={24} className={cn(isLoading && "animate-spin")} />
            </Button>
          </div>

          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
              <Loader2 className="animate-spin" size={48} />
              <p className="font-code text-sm tracking-widest animate-pulse uppercase">Syncing B2 Vertical Mesh...</p>
            </div>
          ) : shorts && shorts.length > 0 ? (
            shorts.map((short) => (
              <ShortsPlayer key={short.id} video={short as any} />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-black/40">
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                <Zap size={48} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">Shorts Matrix Empty</h2>
              <p className="max-w-md font-body text-sm mb-8">No vertical transmissions detected in the B2 registry. Be the first to broadcast!</p>
              {user && (
                <Button 
                  onClick={() => setIsUploadOpen(true)}
                  className="bg-red-600 hover:bg-red-500 font-headline font-bold px-8 py-6 rounded-2xl"
                >
                  START SHORT BROADCAST
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false);
          loadData(); // Re-sync after upload
        }} 
        forcedCategory="Shorts"
      />
      
      <style jsx global>{`
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
