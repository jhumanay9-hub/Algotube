
"use client";

import React, { useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ShortsPlayer from '@/components/video/ShortsPlayer';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Zap, Loader2 } from 'lucide-react';

export default function ShortsPage() {
  const { firestore } = useFirestore();

  const shortsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'videos'),
      where('aspectRatio', '==', '9:16'),
      limit(20)
    );
  }, [firestore]);

  const { data: shorts, isLoading } = useCollection(shortsQuery);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black/50">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-accent gap-4">
              <Loader2 className="animate-spin" size={48} />
              <p className="font-code text-sm tracking-widest animate-pulse uppercase">Syncing Vertical Mesh...</p>
            </div>
          ) : shorts && shorts.length > 0 ? (
            shorts.map((short) => (
              <ShortsPlayer key={short.id} video={short as any} />
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <Zap size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">Shorts Matrix is Empty</h2>
              <p className="max-w-md font-body">Be the first to upload a vertical transmission (9:16) to dominate the feed.</p>
            </div>
          )}
        </main>
      </div>
      
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
