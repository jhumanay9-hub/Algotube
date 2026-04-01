
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CommunityPanel from '@/components/layout/CommunityPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { Share2, ThumbsUp, Eye, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useS3Url } from '@/hooks/use-s3-url';
import { cn } from '@/lib/utils';

export default function VideoDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();

  const [video, setVideo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Optimistic UI States
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/videos?limit=10`);
      const vids = await res.json();
      const found = vids.find((v: any) => v.id === id);
      setVideo(found || vids[0]);
      setRecommendations(vids.filter((v: any) => v.id !== id).slice(0, 3));
      
      if (found) {
        setLikesCount(found.likesCount || 0);
      }

      if (user) {
        const [likesRes, subsRes] = await Promise.all([
          fetch(`/api/likes?userId=${user.uid}`),
          fetch(`/api/subscriptions?userId=${user.uid}`)
        ]);
        const likedIds = await likesRes.json();
        const subIds = await subsRes.json();
        
        setIsLiked(likedIds.includes(id as string));
        setIsSubscribed(subIds.includes(found?.uploaderId || ""));
      }
    } catch (e) {
      console.error('SQL Sync failed');
    } finally {
      setIsLoading(false);
      setIsSocialLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Auth Required", description: "Join the mesh to like transmissions." });
      return;
    }

    // Optimistic Update
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        body: JSON.stringify({ userId: user.uid, videoId: id })
      });
      const data = await res.json();
      setIsLiked(data.isLikedNow);
    } catch (e) {
      // Rollback
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
      toast({ variant: "destructive", title: "SQL Error", description: "Failed to sync like with mesh." });
    }
  };

  const handleSubscribe = async () => {
    if (!user || !video) return;
    
    // Optimistic Update
    const prevSub = isSubscribed;
    setIsSubscribed(!prevSub);

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ userId: user.uid, creatorId: video.uploaderId })
      });
      const data = await res.json();
      setIsSubscribed(data.isSubscribedNow);
    } catch (e) {
      setIsSubscribed(prevSub);
      toast({ variant: "destructive", title: "SQL Error", description: "Subscription mesh update failed." });
    }
  };

  const { url: streamUrl, isLoading: isStreamLoading } = useS3Url(video?.s3Key, video?.videoUrl);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="font-code text-sm tracking-widest text-accent uppercase">Querying Turso Mesh...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              {isStreamLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
                  <Loader2 className="animate-spin text-accent" />
                  <p className="text-[10px] font-code text-accent uppercase">Resolving B2 Stream...</p>
                </div>
              ) : (
                <CanvasVideoPlayer src={streamUrl} />
              )}
            </div>
            
            <div className="glass-panel rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <ShieldCheck size={12} /> TURSO SQL PERSISTENCE
              </div>
              <h1 className="text-2xl font-headline font-bold mb-4">{video?.title}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-accent uppercase">
                    {video?.creator?.[0] || "C"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{video?.creator || "Mesh Creator"}</p>
                    <p className="text-xs text-muted-foreground">AlgoTube Citizen</p>
                  </div>
                  <Button 
                    onClick={handleSubscribe}
                    className={cn(
                      "ml-4 rounded-xl font-headline font-bold transition-all",
                      isSubscribed ? "bg-accent/10 text-accent border border-accent/40" : "bg-white text-black hover:bg-white/90"
                    )}
                  >
                    {isSubscribed ? "SUBSCRIBED" : "SUBSCRIBE"}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={handleLike} className={cn("rounded-xl gap-2 h-11 px-4", isLiked ? "text-accent bg-accent/10" : "bg-white/5")}>
                    <ThumbsUp size={16} className={isLiked ? "fill-accent" : ""} /> {likesCount}
                  </Button>
                  <Button variant="ghost" className="bg-white/5 border border-white/10 rounded-xl gap-2 h-11 px-4">
                    <Share2 size={16} /> Share
                  </Button>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                <div className="flex gap-4 mb-4 text-accent text-xs font-bold items-center">
                  <Eye size={14}/> {video?.viewsCount || 0} views on the mesh
                </div>
                <p className="text-sm text-foreground/80">{video?.description || "No transmission metadata provided."}</p>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-headline font-bold mb-6 flex items-center gap-2 text-accent">
                <Sparkles size={20} /> SQL MATCHES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map(v => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-80">
            <CommunityPanel videoId={id as string} />
          </div>
        </main>
      </div>
    </div>
  );
}
