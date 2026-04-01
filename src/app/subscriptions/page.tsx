"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { Layers, Users, Loader2, BellRing, DatabaseZap } from 'lucide-react';
import { getTursoVideos } from '@/app/actions/turso-actions';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const { user, isUserLoading } = useUser();
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<string[]>([]);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function syncMesh() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [subIds, vids] = await Promise.all([
          fetch(`/api/subscriptions?userId=${user.uid}`).then(r => r.json()),
          getTursoVideos()
        ]);
        setSubscribedCreatorIds(subIds || []);
        setAllVideos(vids);
      } catch (e) {
        console.error('Turso Subscriptions Sync failed.');
      } finally {
        setIsLoading(false);
      }
    }
    syncMesh();
  }, [user]);

  const subscribedVideos = useMemo(() => {
    if (subscribedCreatorIds.length === 0) return [];
    return allVideos.filter(v => subscribedCreatorIds.includes(v.uploaderId));
  }, [subscribedCreatorIds, allVideos]);

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
            {subscribedCreatorIds.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <DatabaseZap size={12} /> TURSO SQL PERSISTENCE ACTIVE
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
                <BellRing size={40} className="text-accent/40" />
              </div>
              <h3 className="text-xl font-headline font-bold text-white mb-2">Don't miss a beat</h3>
              <p className="max-w-xs mb-8">Sign in to see updates from your favorite creators stored on the SQL mesh.</p>
              <Link href="/auth">
                <button className="px-8 py-3 rounded-xl bg-accent text-background font-headline font-bold hover:neon-glow transition-all">
                  SIGN IN
                </button>
              </Link>
            </div>
          ) : isLoading || isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-code text-xs tracking-widest text-accent uppercase">Resolving SQL Mesh Nodes...</p>
            </div>
          ) : subscribedCreatorIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground text-center animate-in fade-in duration-500">
              <Users size={64} className="mb-6 opacity-20" />
              <h3 className="text-xl font-headline font-bold text-white mb-2">Your mesh is empty</h3>
              <p className="max-w-xs mb-8">Follow creators to see their latest transmissions here. Manifests are backed up to Turso SQL.</p>
              <Link href="/">
                <button className="px-8 py-3 rounded-xl border border-accent text-accent font-headline font-bold hover:bg-accent/10 transition-all">
                  DISCOVER CREATORS
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-bottom-4 duration-500">
              {subscribedVideos.length > 0 ? (
                subscribedVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))
              ) : (
                <div className="col-span-full p-12 glass-panel rounded-3xl text-center border-dashed border-white/5 opacity-50">
                  <p className="text-muted-foreground font-body">No recent transmissions from your SQL-linked creators.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
