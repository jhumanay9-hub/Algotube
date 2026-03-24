
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CommunityPanel from '@/components/layout/CommunityPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { Share2, ThumbsUp, ThumbsDown, Eye, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { personalizeVideoRecommendations, PersonalizedVideoRecommendationsOutput } from '@/ai/flows/personalized-video-recommendations-flow';

export default function VideoDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const videoRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'videos', id as string);
  }, [firestore, id]);

  const { data: video, isLoading } = useDoc(videoRef);
  const [recommendations, setRecommendations] = useState<PersonalizedVideoRecommendationsOutput | null>(null);

  const displayVideo = video || MOCK_VIDEOS.find(v => v.id === id) || MOCK_VIDEOS[0];

  useEffect(() => {
    async function getRecommendations() {
      if (!displayVideo) return;
      
      const result = await personalizeVideoRecommendations({
        userId: user?.uid || "anonymous",
        userInterests: ["tech", "coding"],
        viewingHistory: MOCK_VIDEOS.slice(0, 2).map(v => ({ id: v.id, title: v.title, tags: v.tags })),
        availableVideos: MOCK_VIDEOS.map(v => ({
          id: v.id,
          title: v.title,
          description: v.title, // Use title as desc for mock
          tags: v.tags
        }))
      });
      setRecommendations(result);
    }
    getRecommendations();
  }, [id, user, displayVideo]);

  const handleInteraction = async (type: 'like' | 'dislike') => {
    if (!user || !firestore || !id) {
      toast({ title: "Auth Required", description: "Sign in to interact with content." });
      return;
    }

    const interactionRef = doc(firestore, 'userProfiles', user.uid, 'videoInteractions', `${id}_${type}`);
    const videoRef = doc(firestore, 'videos', id as string);

    try {
      await runTransaction(firestore, async (transaction) => {
        const interactionDoc = await transaction.get(interactionRef);
        if (interactionDoc.exists()) {
          toast({ title: "Already Interacted", description: `You have already ${type}d this content.` });
          return;
        }

        transaction.set(interactionRef, {
          userId: user.uid,
          videoId: id,
          interactionType: type,
          timestamp: serverTimestamp()
        });

        transaction.update(videoRef, {
          [type === 'like' ? 'likesCount' : 'dislikesCount']: increment(1)
        });
      });
      
      toast({ title: "Success!", description: `Mesh interaction recorded: ${type}` });
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async () => {
    if (!firestore || !id) return;
    
    const shareUrl = window.location.href;
    await navigator.clipboard.writeText(shareUrl);
    
    const videoDocRef = doc(firestore, 'videos', id as string);
    setDoc(videoDocRef, { shareCount: increment(1) }, { merge: true });

    toast({
      title: "URL Copied",
      description: "Mesh access point shared to clipboard.",
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex gap-4">
          <div className="flex-1 flex flex-col gap-6">
            <CanvasVideoPlayer src={displayVideo.videoUrl || "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"} />
            
            <div className="glass-panel rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <ShieldCheck size={12} /> AI VERIFIED CONTENT
              </div>
              
              <h1 className="text-2xl font-headline font-bold mb-4 pr-32">{displayVideo.title}</h1>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-accent">
                    {displayVideo.uploaderId ? "U" : displayVideo.creator?.[0] || "A"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{displayVideo.creator || "Mesh Creator"}</h3>
                    <p className="text-xs text-muted-foreground">AlgoTube Citizen</p>
                  </div>
                  <Button className="ml-4 bg-white text-black hover:bg-white/90 rounded-xl font-headline font-bold">SUBSCRIBE</Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInteraction('like')}
                      className="rounded-l-lg hover:bg-accent/10 hover:text-accent gap-2 px-4 h-9 group/btn transition-all"
                    >
                      <ThumbsUp size={16} className="group-hover/btn:scale-110" /> {displayVideo.likesCount || 0}
                    </Button>
                    <div className="w-px h-6 bg-white/10" />
                    <Button 
                      variant="ghost" 
                      onClick={() => handleInteraction('dislike')}
                      className="rounded-r-lg hover:bg-destructive/10 hover:text-destructive h-9 px-4 group/btn transition-all"
                    >
                      <ThumbsDown size={16} className="group-hover/btn:scale-110" />
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={handleShare}
                    className="bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-accent/10 hover:text-accent hover:border-accent/40 h-11 px-4 transition-all"
                  >
                    <Share2 size={16} /> Share
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-5 font-body text-sm text-foreground/80 leading-relaxed border border-white/5">
                <div className="flex gap-4 mb-4 font-bold text-foreground items-center">
                  <span className="flex items-center gap-1.5 text-accent bg-accent/5 px-2 py-1 rounded-md border border-accent/10">
                    <Eye size={14}/> {displayVideo.viewsCount || 0} views
                  </span>
                  <span className="text-muted-foreground text-xs">{displayVideo.uploadDate ? new Date(displayVideo.uploadDate.seconds * 1000).toLocaleDateString() : "Syncing..."}</span>
                </div>
                
                {displayVideo.aiSummary && (
                  <div className="mb-4 p-3 rounded-lg bg-accent/5 border-l-2 border-accent italic text-xs">
                    <Sparkles size={12} className="inline mr-2 text-accent" />
                    {displayVideo.aiSummary}
                  </div>
                )}
                
                <p className="mb-4">{displayVideo.description || "No transmission description available."}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayVideo.tags?.map(t => (
                    <span key={t} className="px-3 py-1 rounded-md bg-white/5 text-accent font-code text-[10px] hover:bg-accent/10 transition-colors cursor-default border border-white/5">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-headline font-bold mb-6 flex items-center gap-2">
                <Sparkles className="text-accent" size={20} />
                SEMANTIC MATCHES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations?.recommendedVideos.map(rec => {
                  const v = MOCK_VIDEOS.find(mv => mv.id === rec.id) || MOCK_VIDEOS[0];
                  return (
                    <div key={rec.id} className="relative group/rec">
                      <VideoCard video={v} />
                      <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover/rec:opacity-100 transition-all rounded-2xl flex items-center justify-center p-4 pointer-events-none">
                        <div className="bg-background/90 p-3 rounded-xl border border-accent/40 text-[10px] font-headline font-bold text-center translate-y-2 group-hover/rec:translate-y-0 transition-transform">
                          <p className="text-accent mb-1 uppercase tracking-tighter">AI Insight</p>
                          <p className="text-foreground/90">{rec.reason}</p>
                        </div>
                      </div>
                    </div>
                  );
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
