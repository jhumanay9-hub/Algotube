
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import CommunityPanel from '@/components/layout/CommunityPanel';
import CanvasVideoPlayer from '@/components/video-player/CanvasVideoPlayer';
import VideoCard from '@/components/video-card/VideoCard';
import { MOCK_VIDEOS, MOCK_USER } from '@/app/lib/mock-data';
import { personalizeVideoRecommendations, PersonalizedVideoRecommendationsOutput } from '@/ai/flows/personalized-video-recommendations-flow';
import { Share2, ThumbsUp, ThumbsDown, Scissors, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoDetailPage() {
  const { id } = useParams();
  const video = MOCK_VIDEOS.find(v => v.id === id) || MOCK_VIDEOS[0];
  const [recommendations, setRecommendations] = useState<PersonalizedVideoRecommendationsOutput | null>(null);

  useEffect(() => {
    async function getRecommendations() {
      const result = await personalizeVideoRecommendations({
        userId: MOCK_USER.id,
        userInterests: MOCK_USER.interests,
        viewingHistory: MOCK_VIDEOS.slice(0, 2).map(v => ({ id: v.id, title: v.title, tags: v.tags })),
        availableVideos: MOCK_VIDEOS
      });
      setRecommendations(result);
    }
    getRecommendations();
  }, [id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex gap-4">
          <div className="flex-1 flex flex-col gap-6">
            <CanvasVideoPlayer src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" />
            
            <div className="glass-panel rounded-2xl p-6">
              <h1 className="text-2xl font-headline font-bold mb-4">{video.title}</h1>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-accent">
                    {video.creator[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{video.creator}</h3>
                    <p className="text-xs text-muted-foreground">124K Subscribers</p>
                  </div>
                  <Button className="ml-4 bg-white text-black hover:bg-white/90 rounded-xl font-headline font-bold">SUBSCRIBE</Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1">
                    <Button variant="ghost" className="rounded-l-lg hover:bg-white/10 gap-2 px-4 h-9">
                      <ThumbsUp size={16} /> 12K
                    </Button>
                    <div className="w-px h-6 bg-white/10" />
                    <Button variant="ghost" className="rounded-r-lg hover:bg-white/10 h-9 px-4">
                      <ThumbsDown size={16} />
                    </Button>
                  </div>
                  <Button variant="ghost" className="bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-white/10 h-11 px-4">
                    <Share2 size={16} /> Share
                  </Button>
                  <Button variant="ghost" className="bg-white/5 border border-white/10 rounded-xl gap-2 hover:bg-white/10 h-11 px-4">
                    <Download size={16} />
                  </Button>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 font-body text-sm text-foreground/80 leading-relaxed">
                <div className="flex gap-4 mb-3 font-bold text-foreground">
                  <span className="flex items-center gap-1"><Eye size={14}/> 1.2M views</span>
                  <span>{new Date(video.uploadedAt).toLocaleDateString()}</span>
                </div>
                Detailed analysis of current cybersecurity trends. Exploring the implementation of Zero Trust Architecture 
                in high-performance cloud environments. Join us as we dive into the logs and decipher patterns.
                <div className="mt-4 flex gap-2">
                  {video.tags.map(t => <span key={t} className="text-accent font-code">#{t}</span>)}
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-lg font-headline font-bold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-accent rounded-full" />
                AI-Suggested Content
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations?.recommendedVideos.map(rec => {
                  const v = MOCK_VIDEOS.find(mv => mv.id === rec.id) || MOCK_VIDEOS[0];
                  return (
                    <div key={rec.id} className="relative group">
                      <VideoCard video={v} />
                      <div className="absolute top-2 left-2 bg-accent/90 text-background text-[8px] font-headline font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        MATCHED: {rec.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <CommunityPanel />
        </main>
      </div>
    </div>
  );
}
