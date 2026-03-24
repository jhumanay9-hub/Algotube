
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
import { Share2, ThumbsUp, ThumbsDown, Scissors, Download, Eye, Sparkles } from 'lucide-react';
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

  // Use mock data fallback if firestore data is not available yet
  const displayVideo = video || MOCK_VIDEOS.find(v => v.id === id) || MOCK_VIDEOS[0];

  useEffect(() => {
    async function getRecommendations() {
      const result = await personalizeVideoRecommendations({
        userId: user?.uid || "anonymous",
        userInterests: ["tech", "coding"],
        viewingHistory: MOCK_VIDEOS.slice(0, 2).map(v => ({ id: v.id, title: v.title, tags: v.tags })),
        availableVideos: MOCK_VIDEOS
      });
      setRecommendations(result);
    }
    getRecommendations();
  }, [id, user]);

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
    // Non-blocking increment
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
            
            <div className="glass-panel rounded-2xl p-6">
              <h1 className="text-2xl font-headline font-bold mb-4">{displayVideo.title}</h1>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-accent">
                    {displayVideo.uploaderId ? "U" : displayVideo.creator?.[0] || "A"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{displayVideo.creator || "Mesh Creator"}</h3>
                    <p className="text-xs text-muted-foreground">124K Subscribers</p>
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
                    className="bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-accent/10 hover:text-accent hover:border-accent/40 h-11 px-4 transition-all glow-on-hover"
                  >
                    <Share2 size={16} /> Share
                  </Button>
                  <Button variant="ghost" className="bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-white/10 h-11 px-4">
                    <Download size={16} />
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 font-body text-sm text-foreground/80 leading-relaxed">
                <div className="flex gap-4 mb-3 font-bold text-foreground">
                  <span className="flex items-center gap-1 text-accent"><Eye size={14}/> {displayVideo.viewsCount || 0} views</span>
                  <span>{displayVideo.uploadDate ? new Date(displayVideo.uploadDate.seconds * 1000).toLocaleDateString() : "Live"}</span>
                </div>
                {displayVideo.description || "No description provided for this mesh stream."}
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayVideo.tags?.map(t => <span key={t} className="text-accent font-code">#{t}</span>)}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-headline font-bold mb-4 flex items-center gap-2">
                <Sparkles className="text-accent" size={20} />
                AI-Suggested Content
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations?.recommendedVideos.map(rec => {
                  const v = MOCK_VIDEOS.find(mv => mv.id === rec.id) || MOCK_VIDEOS[0];
                  return (
                    <div key={rec.id} className="relative group">
                      <VideoCard video={v} />
                      <div className="absolute top-2 left-2 bg-accent/90 text-background text-[8px] font-headline font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        MATCHED: {rec.reason}
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

      <style jsx global>{`
        .glow-on-hover:hover {
          box-shadow: 0 0 15px rgba(116, 222, 236, 0.4);
        }
      `}</style>
    </div>
  );
}
