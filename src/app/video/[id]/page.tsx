
"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
import { personalizeVideoRecommendations, PersonalizedVideoRecommendationsOutput } from '@/ai/flows/personalized-video-recommendations-flow';
import { toggleB2Subscription, getB2Subscriptions } from '@/app/actions/b2-social';
import { getB2Videos, toggleB2Like, getB2LikedVideos, addToB2History } from '@/app/actions/b2-store';
import { useS3Url } from '@/hooks/use-s3-url';
import { cn } from '@/lib/utils';

export default function VideoDetailPage() {
  const { id } = useParams();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const [video, setVideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<PersonalizedVideoRecommendationsOutput | null>(null);

  // Initial Data Sync
  useEffect(() => {
    async function sync() {
      setIsLoading(true);
      const videos = await getB2Videos();
      const found = videos.find(v => v.id === id);
      setVideo(found || videos[0]);
      setAllVideos(videos);
      setIsLoading(false);

      if (user) {
        // Resolve social state
        const [likes, subs] = await Promise.all([
          getB2LikedVideos(user.uid),
          getB2Subscriptions(user.uid)
        ]);
        setIsLiked(likes.includes(id as string));
        
        const creatorId = found?.uploaderId || found?.id || "system";
        setIsSubscribed(subs.includes(creatorId));
        setIsSubLoading(false);

        // Add to history
        addToB2History(user.uid, id as string);
      } else {
        setIsSubLoading(false);
      }
    }
    sync();
  }, [id, user]);

  // AI Recommendations
  useEffect(() => {
    if (!video || allVideos.length === 0) return;
    async function getRecs() {
      const result = await personalizeVideoRecommendations({
        userId: user?.uid || "guest",
        userInterests: ["tech", "coding"],
        viewingHistory: allVideos.slice(0, 3).map(v => ({ id: v.id, title: v.title, tags: v.tags })),
        availableVideos: allVideos.slice(0, 10).map(v => ({ id: v.id, title: v.title, description: v.title, tags: v.tags }))
      });
      setRecommendations(result);
    }
    getRecs();
  }, [video, allVideos, user]);

  const s3Key = video?.s3Key || video?.videoUrl;
  const { url: streamUrl, isLoading: isStreamLoading } = useS3Url(s3Key, video?.videoUrl);

  const handleLike = async () => {
    if (!user) {
      toast({ title: "Auth Required", description: "Sign in to like this transmission." });
      return;
    }
    const result = await toggleB2Like(user.uid, id as string);
    setIsLiked(result);
    toast({ title: result ? "Liked" : "Unliked", description: "Updated on the B2 Social Mesh." });
  };

  const handleSubscribe = async () => {
    if (!user || !video) return;
    const creatorId = video.uploaderId || video.id;
    try {
      setIsSubLoading(true);
      const result = await toggleB2Subscription(user.uid, creatorId, isSubscribed);
      if (result) setIsSubscribed(result.isSubscribed);
    } finally {
      setIsSubLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="font-code text-sm tracking-widest text-accent uppercase">Resolving B2 Transmission...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex gap-4">
          <div className="flex-1 flex flex-col gap-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              {isStreamLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4">
                  <Loader2 className="animate-spin text-accent" />
                  <p className="text-[10px] font-code text-accent uppercase">Syncing B2 Stream...</p>
                </div>
              ) : (
                <CanvasVideoPlayer src={streamUrl} />
              )}
            </div>
            
            <div className="glass-panel rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <ShieldCheck size={12} /> B2 DATA MESH PERSISTENCE
              </div>
              <h1 className="text-2xl font-headline font-bold mb-4">{video?.title}</h1>
              <div className="flex items-center justify-between mb-6">
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
                    disabled={isSubLoading}
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
                    <ThumbsUp size={16} className={isLiked ? "fill-accent" : ""} /> {isLiked ? "Liked" : "Like"}
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
                <Sparkles size={20} /> ALGORITHMIC MATCHES (B2)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations?.recommendedVideos.map(rec => {
                  const v = allVideos.find(mv => mv.id === rec.id);
                  return v ? <VideoCard key={rec.id} video={v} /> : null;
                })}
              </div>
            </div>
          </div>
          <CommunityPanel videoId={id as string} />
        </main>
      </div>
    </div>
  );
}
