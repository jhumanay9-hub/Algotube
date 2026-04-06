"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/config";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import VideoCard from "@/components/video-card/VideoCard";
import { Users, Video, Loader2, CheckCircle2, DatabaseZap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ChannelPageClient() {
  const { id } = useParams();
  const { toast } = useToast();

  const [channelVideos, setChannelVideos] = useState<any[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(getApiUrl("get_videos.php"));
        const data = await res.json();

        // Map PHP schema to expected VideoCard schema
        const mappedData = Array.isArray(data)
          ? data.map((v) => ({
              ...v,
              url: v.file_path,
              author_name: "Local Upload",
              description: `Uploaded on ${v.upload_date}`,
            }))
          : [];

        // As a placeholder for the MySQL backend, just show all videos or filter generically
        setChannelVideos(mappedData);
      } catch (e) {
        console.error("Channel MySQL Sync Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleSubscribe = () => {
    toast({
      title: "Auth Required",
      description: "Subscriptions will be implemented in the new PHP backend.",
    });
    setIsSubscribed(!isSubscribed);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
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
          <div className="h-48 w-full bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl mt-4 relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[9px] text-accent font-code">
              <DatabaseZap size={10} /> LOCAL PROFILE
            </div>
          </div>

          <div className="px-8 -mt-12 flex flex-col md:flex-row items-end gap-6 mb-12">
            <Avatar className="h-32 w-32 border-4 border-background rounded-3xl shadow-2xl">
              <AvatarImage src={`https://picsum.photos/seed/${id}/200/200`} />
              <AvatarFallback className="text-4xl bg-white/5">C</AvatarFallback>
            </Avatar>

            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-headline font-bold">
                  Local Creator
                </h1>
                <CheckCircle2
                  className="text-accent fill-accent/20"
                  size={20}
                />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
                <span>@creator_local</span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> 0
                </span>
                <span className="flex items-center gap-1">
                  <Video size={14} /> {channelVideos.length}
                </span>
              </div>
            </div>

            <Button
              onClick={handleSubscribe}
              className={cn(
                "mb-2 rounded-xl font-headline font-bold px-8 h-12 transition-all duration-300",
                isSubscribed
                  ? "bg-accent/10 text-accent border border-accent/40 shadow-[0_0_15px_rgba(116,222,236,0.2)]"
                  : "bg-white text-black hover:bg-white/90",
              )}
            >
              {isSubscribed ? "CONNECTED" : "CONNECT"}
            </Button>
          </div>

          <div className="px-4">
            <div className="flex items-center gap-8 border-b border-white/5 mb-8">
              <button className="pb-4 border-b-2 border-accent text-accent font-bold text-[10px] uppercase tracking-widest">
                Videos
              </button>
              <button className="pb-4 text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-widest">
                Community
              </button>
            </div>

            {channelVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                {channelVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 opacity-30 text-center">
                <Video size={48} className="mb-4 text-accent" />
                <p className="font-headline font-bold uppercase tracking-widest text-xs">
                  No local transmissions detected
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
