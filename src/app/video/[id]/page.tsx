
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CommunityPanel from '@/components/layout/CommunityPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { Share2, ThumbsUp, ThumbsDown, Eye, Sparkles, ShieldCheck, UserPlus, UserCheck, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { personalizeVideoRecommendations, PersonalizedVideoRecommendationsOutput } from '@/ai/flows/personalized-video-recommendations-flow';
import { toggleSubscription, addToHistory } from '@/firebase/social-logic';
import { useS3Url } from '@/hooks/use-s3-url';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function VideoDetailPage() {
  const { id } = useParams();
  const { firestore } = useFirebase();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const videoRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'videos', id as string);
  }, [firestore, id]);

  const { data: video, isLoading: isVideoLoading } = useDoc(videoRef);
  
  const displayVideo = video || MOCK_VIDEOS.find(v => v.id === id) || MOCK_VIDEOS[0];
  const creatorId = displayVideo.uploaderId || (displayVideo as any).uploaderId || "system_mock";

  // S3 URL resolution for Backblaze B2 playback
  const s3Key = (displayVideo as any).s3Key || (displayVideo as any).videoUrl;
  const { url: streamUrl, isLoading: isStreamLoading } = useS3Url(
    s3Key, 
    (displayVideo as any).videoUrl // Fallback to original URL
  );

  const subRef = useMemoFirebase(() => {
    if (!firestore || !user || !creatorId) return null;
    return doc(firestore, 'userProfiles', user.uid, 'subscriptions', creatorId);
  }, [firestore, user, creatorId]);

  const { data: subscription } = useDoc(subRef);
  const isSubscribed = !!subscription;

  const [recommendations, setRecommendations] = useState<PersonalizedVideoRecommendationsOutput | null>(null);

  useEffect(() => {
    if (user && firestore && id) {
      addToHistory(firestore, user.uid, id as string);
    }
  }, [id, user, firestore]);

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
          description: v.title,
          tags: v.tags
        }))
      });
      setRecommendations(result);
    }
    getRecommendations();
  }, [id, user, displayVideo]);

  const handleInteraction = async (type: 'like' | 'dislike') => {
    if (isUserLoading || !user || !firestore || !id || !videoRef) return;

    const interactionRef = doc(firestore, 'userProfiles', user.uid, 'videoInteractions', `${id}_${type}`);

    try {
      await runTransaction(firestore, async (transaction) => {
        const interactionDoc = await transaction.get(interactionRef);
        if (interactionDoc.exists()) {
          return Promise.reject("ALREADY_INTERACTED");
        }

        const videoDoc = await transaction.get(videoRef);
        if (!videoDoc.exists()) {
          transaction.set(videoRef, {
            id: id,
            title: displayVideo.title,
            description: (displayVideo as any).description || displayVideo.title,
            videoUrl: (displayVideo as any).videoUrl,
            thumbnailUrl: (displayVideo as any).thumbnailUrl || (displayVideo as any).thumbnail,
            uploaderId: creatorId,
            uploadDate: serverTimestamp(),
            viewsCount: (displayVideo as any).viewsCount || (displayVideo as any).views,
            likesCount: type === 'like' ? 1 : 0,
            dislikesCount: type === 'dislike' ? 1 : 0,
            commentsCount: 0,
            shareCount: 0,
            processingStatus: 'ready',
            category: (displayVideo as any).category || "General",
            tags: displayVideo.tags,
            creator: displayVideo.creator,
            s3Key: (displayVideo as any).s3Key || null
          });
        } else {
          transaction.update(videoRef, {
            [type === 'like' ? 'likesCount' : 'dislikesCount']: increment(1)
          });
        }

        transaction.set(interactionRef, {
          userId: user.uid,
          videoId: id,
          interactionType: type,
          timestamp: serverTimestamp()
        });
      });
      
      toast({ title: "Success!", description: `Transmission ${type}d.` });
    } catch (e: any) {
      if (e === "ALREADY_INTERACTED") {
        toast({ title: "Already Interacted" });
      } else {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: videoRef.path,
          operation: 'update',
          requestResourceData: { [type === 'like' ? 'likesCount' : 'dislikesCount']: 'increment' }
        }));
      }
    }
  };

  const handleSubscribe = async () => {
    if (isUserLoading || !user || !firestore || !creatorId) return;
    await toggleSubscription(firestore, user.uid, creatorId, isSubscribed);
    toast({ title: isSubscribed ? "Unsubscribed" : "Subscribed" });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex gap-4">
          <div className="flex-1 flex flex-col gap-6">
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
              {isStreamLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl z-20 gap-4">
                  <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin shadow-[0_0_20px_rgba(116,222,236,0.2)]" />
                  <p className="font-code text-xs text-accent animate-pulse uppercase tracking-[0.2em]">Resolving S3 Mesh Stream...</p>
                </div>
              ) : (
                <CanvasVideoPlayer src={streamUrl || "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"} />
              )}
            </div>
            
            <div className="glass-panel rounded-2xl p-6 relative">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <ShieldCheck size={12} /> B2 PROTECTED TRANSMISSION
              </div>
              
              <h1 className="text-2xl font-headline font-bold mb-4 pr-32">{displayVideo.title}</h1>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Link href={`/channel/${creatorId}`}>
                    <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-accent hover:bg-accent/20 transition-all cursor-pointer">
                      {displayVideo.creator?.[0] || "A"}
                    </div>
                  </Link>
                  <div>
                    <Link href={`/channel/${creatorId}`} className="font-bold text-sm hover:text-accent transition-colors block">
                      {displayVideo.creator || "Mesh Creator"}
                    </Link>
                    <p className="text-xs text-muted-foreground">AlgoTube Citizen</p>
                  </div>
                  <Button 
                    onClick={handleSubscribe}
                    disabled={isUserLoading}
                    className={cn(
                      "ml-4 rounded-xl font-headline font-bold transition-all duration-300",
                      isSubscribed ? "bg-accent/10 text-accent border border-accent/40" : "bg-white text-black hover:bg-white/90"
                    )}
                  >
                    {isSubscribed ? "SUBSCRIBED" : "SUBSCRIBE"}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => handleInteraction('like')} className="bg-white/5 rounded-xl border border-white/10 gap-2 px-4 h-11">
                    <ThumbsUp size={16} /> {(displayVideo as any).likesCount || 0}
                  </Button>
                  <Button variant="ghost" onClick={() => {}} className="bg-white/5 border border-white/10 rounded-xl gap-2 h-11 px-4">
                    <Share2 size={16} /> Share
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-5 font-body text-sm border border-white/5">
                <div className="flex gap-4 mb-4 font-bold text-foreground items-center">
                  <span className="flex items-center gap-1.5 text-accent">
                    <Eye size={14}/> {(displayVideo as any).viewsCount || (displayVideo as any).views} views
                  </span>
                </div>
                <p className="mb-4">{(displayVideo as any).description || "No transmission description available."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {displayVideo.tags?.map(t => (
                    <span key={t} className="px-3 py-1 rounded-md bg-white/5 text-accent font-code text-[10px] border border-white/5">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-headline font-bold mb-6 flex items-center gap-2 text-accent">
                <Sparkles size={20} /> SEMANTIC MATCHES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations?.recommendedVideos.map(rec => {
                  const v = MOCK_VIDEOS.find(mv => mv.id === rec.id) || MOCK_VIDEOS[0];
                  return <VideoCard key={rec.id} video={v} />;
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
