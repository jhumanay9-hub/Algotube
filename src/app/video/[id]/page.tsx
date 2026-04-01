
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ConversationPanel from '@/components/layout/ConversationPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { useUser } from '@/firebase';
import { ThumbsUp, ThumbsDown, Star, Eye, Sparkles, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STABLE_FALLBACK_URL = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

/**
 * VideoDetailPage - SQL Engagement Mesh
 * Handles real-time hydration of Like/Dislike/Favorite states from Turso.
 * Implements optimistic mutual exclusion for engagement buttons.
 */
export default function VideoDetailPage() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const playerRef = useRef<any>(null);

  const [video, setVideo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConversation, setShowConversation] = useState(true);
  const [externalSyncState, setExternalSyncState] = useState<any>(null);
  const [localPlayerState, setLocalPlayerState] = useState({ currentTime: 0, isPaused: true });
  
  // Engagement States
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const vidStr = id?.toString();
      
      // Parallel fetch for video metadata and user engagement status
      const [vRes, lRes, dRes, fRes] = await Promise.all([
        fetch(`/api/videos?limit=10`),
        user ? fetch(`/api/likes?userId=${user.uid}&videoId=${vidStr}`).then(r => r.json()) : Promise.resolve({ active: false }),
        user ? fetch(`/api/dislikes?userId=${user.uid}&videoId=${vidStr}`).then(r => r.json()) : Promise.resolve({ active: false }),
        user ? fetch(`/api/favorites?userId=${user.uid}&videoId=${vidStr}`).then(r => r.json()) : Promise.resolve({ active: false })
      ]);
      
      const vData = await vRes.json();
      const vids = Array.isArray(vData) ? vData : [];
      let found = vids.find((v: any) => v.id?.toString() === vidStr);
      
      // Sanitization guard for frontend stability
      if (found) {
        // Trim whitespace and validate URL
        let videoUrl = (found.url || "").trim();
        
        if (!videoUrl || videoUrl.includes('placeholder.com') || videoUrl.includes('undefined')) {
          videoUrl = STABLE_FALLBACK_URL;
        }
        
        found.url = videoUrl;
        console.log("Mesh Sync: Passing sanitized video URL:", found.url);
      }

      setVideo(found || vids[0] || null);
      setRecommendations(vids.filter((v: any) => v.id?.toString() !== vidStr).slice(0, 3));
      
      // Hydrate interaction states from the SQL mesh
      if (user) {
        setIsLiked(lRes.active === true);
        setIsDisliked(dRes.active === true);
        setIsFavorited(fRes.active === true);
      }
    } catch (e: any) {
      console.error('Mesh Sync Failed:', e.message || e);
    } finally {
      setIsLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current) {
        setLocalPlayerState({
          currentTime: playerRef.current.getCurrentTime(),
          isPaused: playerRef.current.getIsPaused()
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * handleInteraction - Optimistic SQL Sync
   * Implements mutual exclusion: Liking a video automatically un-dislikes it.
   */
  const handleInteraction = async (type: 'likes' | 'dislikes' | 'favorites') => {
    if (!user) {
      toast({ title: "Auth Required", description: "Sign in to interact with the mesh." });
      return;
    }

    // Capture previous states for rollback
    const prevLiked = isLiked;
    const prevDisliked = isDisliked;
    const prevFavorited = isFavorited;

    // Optimistic UI updates
    if (type === 'likes') {
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      if (nextLiked) setIsDisliked(false); // Mutually exclusive
    } else if (type === 'dislikes') {
      const nextDisliked = !isDisliked;
      setIsDisliked(nextDisliked);
      if (nextDisliked) setIsLiked(false); // Mutually exclusive
    } else if (type === 'favorites') {
      setIsFavorited(!isFavorited);
    }

    try {
      const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, videoId: id })
      });
      
      if (!res.ok) throw new Error('Interaction rejected by mesh');
      
      const data = await res.json();
      
      // Final sync with actual database response
      if (type === 'likes') setIsLiked(data.active);
      if (type === 'dislikes') setIsDisliked(data.active);
      if (type === 'favorites') setIsFavorited(data.active);

    } catch (e) {
      // Rollback on failure
      setIsLiked(prevLiked);
      setIsDisliked(prevDisliked);
      setIsFavorited(prevFavorited);
      toast({ variant: "destructive", title: "Action Failed", description: "SQL registry rejected the transmission." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="font-code text-sm tracking-widest text-accent uppercase">Resolving SQL Mesh...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />
        <div className="flex flex-1 items-center justify-center text-muted-foreground font-code uppercase text-xs">
          Transmission not found in SQL registry
        </div>
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
              <CanvasVideoPlayer 
                ref={playerRef}
                src={video?.url} 
                externalState={externalSyncState} 
              />
            </div>
            
            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-accent/20 text-accent text-[9px] font-code px-2 py-0.5 rounded-full border border-accent/30 uppercase">SQL Sync Mesh</span>
                </div>

                <h1 className="text-3xl font-headline font-bold mb-6">{video?.title}</h1>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-accent/20">
                      <AvatarFallback className="bg-white/5">{video?.author_name?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-headline font-bold text-lg">{video?.author_name || "Mesh Creator"}</p>
                      <p className="text-xs text-muted-foreground">AlgoTube Citizen</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInteraction('likes')} 
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 transition-all duration-300", 
                        isLiked ? "text-accent bg-accent/10 border border-accent/30 shadow-[0_0_10px_rgba(116,222,236,0.2)]" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      <ThumbsUp size={16} className={isLiked ? "fill-accent" : ""} /> 
                      <span className="text-[10px] font-bold">{video?.likesCount || 0}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInteraction('dislikes')} 
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 transition-all duration-300", 
                        isDisliked ? "text-red-500 bg-red-500/10 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      <ThumbsDown size={16} className={isDisliked ? "fill-red-500" : ""} /> 
                      <span className="text-[10px] font-bold">{video?.dislikesCount || 0}</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInteraction('favorites')} 
                      className={cn(
                        "rounded-2xl h-10 px-4 transition-all duration-300", 
                        isFavorited ? "text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      <Star size={16} className={isFavorited ? "fill-yellow-500" : ""} /> 
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowConversation(!showConversation)}
                      className={cn("rounded-2xl gap-2 h-10 px-4 border transition-all duration-300", showConversation ? "border-accent text-accent bg-accent/5" : "bg-white/5 border border-white/10")}
                    >
                      <Users size={16} /> 
                      <span className="font-bold text-[10px] uppercase tracking-widest">Chat</span>
                    </Button>
                  </div>
                </div>

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-accent font-code text-[10px]">
                      <Eye size={12} /> SYNCED FROM EDGE
                    </div>
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
              <ConversationPanel 
                videoId={id?.toString() as string} 
                onSyncState={setExternalSyncState}
                playerState={localPlayerState}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
