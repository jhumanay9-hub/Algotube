
"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Users, Video, Calendar, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getB2Subscriptions, toggleB2Subscription } from '@/app/actions/b2-social';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ChannelPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(true);

  const channelRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'userProfiles', id as string);
  }, [firestore, id]);

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useDoc(channelRef);

  const videosQuery = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return query(
      collection(firestore, 'videos'),
      where('uploaderId', '==', id as string),
      orderBy('uploadDate', 'desc'),
      limit(20)
    );
  }, [firestore, id]);

  const { data: channelVideos, isLoading: isVideosLoading, error: videosError } = useCollection(videosQuery);

  // Load subscription state from B2
  useEffect(() => {
    async function checkSubscription() {
      if (user && id) {
        try {
          const subs = await getB2Subscriptions(user.uid);
          setIsSubscribed(subs.includes(id as string));
        } catch (e) {
          console.warn('Fallback: B2 Subscription check failed');
        } finally {
          setIsSubLoading(false);
        }
      } else {
        setIsSubLoading(false);
      }
    }
    checkSubscription();
  }, [user, id]);

  const handleSubscribe = async () => {
    if (isUserLoading) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent('auth-required-glow'));
      toast({ 
        variant: "destructive",
        title: "Action Required", 
        description: "Sign in to subscribe to this channel." 
      });
      return;
    }

    try {
      setIsSubLoading(true);
      const result = await toggleB2Subscription(user.uid, id as string, isSubscribed);
      if (result) {
        setIsSubscribed(result.isSubscribed);
        toast({
          title: result.isSubscribed ? "Subscribed" : "Unsubscribed",
          description: result.isSubscribed ? "Connected via B2 Social Mesh." : "Disconnected from creator.",
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Mesh Error",
        description: "B2 Persistence node failed to respond."
      });
    } finally {
      setIsSubLoading(false);
    }
  };

  if (isProfileLoading && !profileError) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          {/* Channel Banner */}
          <div className="h-48 w-full bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl mt-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/mesh/1200/400')] opacity-10 bg-cover bg-center" />
          </div>

          {/* Channel Info */}
          <div className="px-8 -mt-12 flex flex-col md:flex-row items-end gap-6 mb-12">
            <Avatar className="h-32 w-32 border-4 border-background rounded-3xl shadow-2xl">
              <AvatarImage src={profile?.profilePictureUrl || `https://picsum.photos/seed/${id}/200/200`} />
              <AvatarFallback className="text-4xl bg-white/5">{profile?.username?.[0]?.toUpperCase() || 'A'}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-headline font-bold">{profile?.username || "Mesh Creator"}</h1>
                <CheckCircle2 className="text-accent fill-accent/20" size={20} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                <span>@{profile?.username?.toLowerCase().replace(/\s+/g, '') || 'creator'}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {profile?.subscriberCount || 0} subscribers</span>
                <span className="flex items-center gap-1"><Video size={14} /> {channelVideos?.length || 0} videos</span>
              </div>
            </div>

            <Button 
              onClick={handleSubscribe}
              disabled={isSubLoading || isUserLoading}
              className={cn(
                "mb-2 rounded-xl font-headline font-bold px-8 h-12 transition-all duration-300",
                isSubscribed 
                  ? "bg-accent/10 text-accent border border-accent/40 shadow-[0_0_15px_rgba(116,222,236,0.2)]" 
                  : "bg-white text-black hover:bg-white/90"
              )}
            >
              {isSubLoading ? <Loader2 className="animate-spin" size={18} /> : (isSubscribed ? "SUBSCRIBED (B2)" : "SUBSCRIBE")}
            </Button>
          </div>

          {profileError && (
            <div className="mx-8 mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <ShieldAlert size={18} />
              <span>Firestore node unreachable. Using B2 Social Mesh fallback for interactions.</span>
            </div>
          )}

          {/* Channel Content */}
          <div className="px-4">
            <div className="flex items-center gap-8 border-b border-white/5 mb-8">
              <button className="pb-4 border-b-2 border-accent text-accent font-bold text-sm uppercase tracking-widest">Videos</button>
              <button className="pb-4 text-muted-foreground hover:text-foreground font-bold text-sm uppercase tracking-widest">Shorts</button>
              <button className="pb-4 text-muted-foreground hover:text-foreground font-bold text-sm uppercase tracking-widest">Community</button>
              <button className="pb-4 text-muted-foreground hover:text-foreground font-bold text-sm uppercase tracking-widest">About</button>
            </div>

            {isVideosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-video rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : channelVideos && channelVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {channelVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 opacity-30">
                <Video size={48} className="mb-4" />
                <p className="font-headline font-bold uppercase tracking-widest">No transmissions found</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
