
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Layers, Users, Loader2, BellRing, DatabaseZap } from 'lucide-react';
import { getB2Subscriptions } from '@/app/actions/b2-social';
import Link from 'next/link';

export default function SubscriptionsPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const [subscribedCreatorIds, setSubscribedCreatorIds] = useState<string[]>([]);
  const [isB2Loading, setIsB2Loading] = useState(true);

  // Fetch creator IDs from Backblaze B2
  useEffect(() => {
    async function fetchB2Subs() {
      if (user) {
        try {
          const ids = await getB2Subscriptions(user.uid);
          setSubscribedCreatorIds(ids);
        } catch (e) {
          console.error('B2 Subscription fetch failed');
        } finally {
          setIsB2Loading(false);
        }
      } else {
        setIsB2Loading(false);
      }
    }
    fetchB2Subs();
  }, [user]);

  // Fetch videos from Firestore using IDs from B2
  const videosQuery = useMemoFirebase(() => {
    if (!firestore || subscribedCreatorIds.length === 0) return null;
    return query(
      collection(firestore, 'videos'),
      where('uploaderId', 'in', subscribedCreatorIds.slice(0, 30)),
      orderBy('uploadDate', 'desc'),
      limit(50)
    );
  }, [firestore, subscribedCreatorIds]);

  const { data: subscribedVideos, isLoading: isVideosLoading, error: videosError } = useCollection(videosQuery);

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
                <DatabaseZap size={12} /> B2 PERSISTENCE ACTIVE
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground text-center">
              <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center mb-6">
                <BellRing size={40} className="text-accent/40" />
              </div>
              <h3 className="text-xl font-headline font-bold text-white mb-2">Don't miss a beat</h3>
              <p className="max-w-xs mb-8">Sign in to see updates from your favorite creators stored on the B2 mesh.</p>
              <Link href="/auth">
                <button className="px-8 py-3 rounded-xl bg-accent text-background font-headline font-bold hover:neon-glow transition-all">
                  SIGN IN
                </button>
              </Link>
            </div>
          ) : isB2Loading || isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-code text-xs tracking-widest text-accent uppercase">Resolving B2 Social Nodes...</p>
            </div>
          ) : subscribedCreatorIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground text-center">
              <Users size={64} className="mb-6 opacity-20" />
              <h3 className="text-xl font-headline font-bold text-white mb-2">Your mesh is empty</h3>
              <p className="max-w-xs mb-8">Follow creators to see their latest transmissions here. Manifests are backed up to Backblaze.</p>
              <Link href="/trending">
                <button className="px-8 py-3 rounded-xl border border-accent text-accent font-headline font-bold hover:bg-accent/10 transition-all">
                  DISCOVER CREATORS
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {isVideosLoading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
                ))
              ) : subscribedVideos && subscribedVideos.length > 0 ? (
                subscribedVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))
              ) : (
                <div className="col-span-full p-12 glass-panel rounded-3xl text-center">
                  <p className="text-muted-foreground">No recent transmissions from your B2-linked creators.</p>
                  {videosError && (
                    <p className="text-red-400 text-[10px] mt-2 font-code">Warning: Firestore index unreachable. Feed may be incomplete.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
