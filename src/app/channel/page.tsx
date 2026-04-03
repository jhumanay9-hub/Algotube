
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import VideoCard from '@/components/video-card/VideoCard';
import { Users, Video, Loader2, CheckCircle2, DatabaseZap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function ChannelContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useToast();

  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/get_videos.php`);
        const data = await res.json();
        
        const mappedData = Array.isArray(data) ? data.map(v => ({
          ...v,
          url: v.file_path,
          author_name: 'Local Upload',
          description: `Uploaded on ${v.upload_date}`
        })) : [];
        
        setChannelVideos(mappedData);
      } catch (e) {
        console.error('Channel MySQL Sync Error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubscribe = () => {
    toast({ title: "Auth Required", description: "Subscriptions will be implemented in the new PHP backend." });
    setIsSubscribed(!isSubscribed);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-black">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black text-white">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="h-48 w-full bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-emerald-950/40 rounded-3xl mt-4 relative overflow-hidden border border-emerald-500/10">
             <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-emerald-500/20 text-[9px] text-emerald-500 font-code tracking-widest uppercase">
                <DatabaseZap size={10} /> LOCAL PROFILE
             </div>
          </div>

          <div className="px-8 -mt-12 flex flex-col md:flex-row items-end gap-6 mb-12">
            <Avatar className="h-32 w-32 border-4 border-black rounded-3xl shadow-2xl shadow-emerald-500/10">
              <AvatarImage src={`https://picsum.photos/seed/${id}/200/200`} />
              <AvatarFallback className="text-4xl bg-zinc-900 text-emerald-500">C</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-headline font-bold text-white">Local Creator</h1>
                <CheckCircle2 className="text-emerald-500 fill-emerald-500/20" size={20} />
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500 font-body">
                <span className="uppercase tracking-widest">@creator_local</span>
                <span className="flex items-center gap-2 tracking-tighter"><Users size={14} /> 0 CONNECTED</span>
                <span className="flex items-center gap-2 tracking-tighter"><Video size={14} /> {channelVideos.length} NODES</span>
              </div>
            </div>

            <Button 
              onClick={handleSubscribe}
              className={cn(
                "mb-2 rounded-2xl font-headline font-bold px-8 h-12 transition-all duration-300",
                isSubscribed 
                  ? "bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                  : "bg-white text-black hover:bg-emerald-50"
              )}
            >
              {isSubscribed ? "CONNECTED" : "CONNECT"}
            </Button>
          </div>

          <div className="px-4">
            <div className="flex items-center gap-8 border-b border-emerald-500/10 mb-8">
              <button className="pb-4 border-b-2 border-emerald-500 text-emerald-500 font-bold text-[10px] uppercase tracking-[0.2em]">Live Transmissions</button>
              <button className="pb-4 text-zinc-600 hover:text-emerald-400 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors">Mesh Logs</button>
            </div>

            {channelVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {channelVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 opacity-10 text-center">
                <Video size={48} className="mb-4 text-emerald-500" />
                <p className="font-headline font-bold uppercase tracking-widest text-xs text-emerald-500">No Mesh Signals Detected</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ChannelPage() {
  return (
    <Suspense fallback={
       <div className="flex flex-col h-screen bg-black items-center justify-center gap-4">
         <Loader2 className="animate-spin text-emerald-500" size={40} />
         <p className="font-code text-[10px] tracking-widest text-emerald-500 uppercase animate-pulse">Syncing User Profile...</p>
       </div>
    }>
      <ChannelContent />
    </Suspense>
  );
}
