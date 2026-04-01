"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ConversationPanel from '@/components/layout/ConversationPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { MessageCircle, ThumbsUp, Eye, Sparkles, ShieldCheck, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useS3Url } from '@/hooks/use-s3-url';
import { cn } from '@/lib/utils';

/**
 * VideoDetailPage - Conversation Integrated
 * Features Turso SQL Chat Rooms & Polling.
 */
export default function VideoDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();

  const [video, setVideo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConversation, setShowConversation] = useState(true);
  
  // Optimistic UI States
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

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
      console.error('Mesh Sync Failed');
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Auth Required", description: "Sign in to interact with mesh." });
      return;
    }

    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, videoId: id })
      });
      const data = await res.json();
      setIsLiked(data.isLikedNow);
    } catch (e) {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  };

  const { url: streamUrl, isLoading: isStreamLoading } = useS3Url(video?.s3Key, video?.videoUrl);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="font-code text-sm tracking-widest text-accent uppercase">Resolving SQL Mesh...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex flex-col xl:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl group border border-white/5">
              {isStreamLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-accent" />
                  <p className="text-[10px] font-code text-accent uppercase">Syncing B2 Stream...</p>
                </div>
              ) : (
                <CanvasVideoPlayer src={streamUrl} />
              )}
            </div>
            
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <MessageCircle size={150} className="text-accent fill-accent" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-accent/20 text-accent text-[9px] font-code px-2 py-0.5 rounded-full border border-accent/30 uppercase">SQL Meta Verified</span>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-code">Transmission ID: {id?.slice(0, 8)}</span>
                </div>

                <h1 className="text-3xl font-headline font-bold mb-6">{video?.title}</h1>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-accent/20">
                      <AvatarImage src={`https://picsum.photos/seed/${video?.uploaderId}/100/100`} />
                      <AvatarFallback className="bg-white/5">{video?.creator?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-headline font-bold text-lg">{video?.creator || "Mesh Creator"}</p>
                      <p className="text-xs text-muted-foreground">Certified AlgoTube Citizen</p>
                    </div>
                    <Button 
                      className={cn(
                        "ml-6 rounded-xl font-headline font-bold h-11 px-8 transition-all",
                        isSubscribed ? "bg-accent/10 text-accent border border-accent/40" : "bg-white text-black hover:bg-white/90"
                      )}
                    >
                      {isSubscribed ? "CONNECTED" : "CONNECT"}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={handleLike} className={cn("rounded-2xl gap-3 h-12 px-6", isLiked ? "text-accent bg-accent/10 border border-accent/30" : "bg-white/5 border border-white/10")}>
                      <ThumbsUp size={18} className={isLiked ? "fill-accent" : ""} /> 
                      <span className="font-bold">{likesCount}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowConversation(!showConversation)}
                      className={cn("rounded-2xl gap-3 h-12 px-6 border", showConversation ? "border-accent text-accent bg-accent/5" : "bg-white/5 border-white/10")}
                    >
                      <MessageCircle size={18} /> 
                      <span className="font-bold">JOIN CONVERSATION</span>
                    </Button>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-accent font-code text-xs">
                      <Eye size={14} /> {video?.viewsCount || 0} OBSERVED
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="text-xs text-muted-foreground font-code uppercase">Category: {video?.category}</div>
                  </div>
                  <p className="text-foreground/80 leading-relaxed font-body text-sm">{video?.description || "No encrypted metadata provided for this transmission."}</p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-accent" size={20} />
                <h3 className="text-lg font-headline font-bold uppercase tracking-widest">Mesh Affinity</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map(v => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          </div>
          
          {showConversation && (
            <div className="w-full xl:w-96 shrink-0 animate-in slide-in-from-right-4 duration-500">
              <ConversationPanel videoId={id as string} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
