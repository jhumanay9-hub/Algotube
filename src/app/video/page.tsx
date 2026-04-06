"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ConversationPanel from "@/components/layout/ConversationPanel";
import CanvasVideoPlayer from "@/components/video-player/CanvasVideoPlayer";
import VideoCard from "@/components/video-card/VideoCard";
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  Eye,
  Sparkles,
  Loader2,
  Users,
  DatabaseZap,
  Zap,
  Send,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn, getMediaUrl } from "@/lib/utils";
import { getApiUrl } from "@/lib/config";
import { useUser } from "@/context/AuthContext";

const STABLE_FALLBACK_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function VideoContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { user } = useUser();
  const { toast } = useToast();
  const playerRef = useRef<any>(null);

  const [video, setVideo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConversation, setShowConversation] = useState(true);
  const [externalSyncState, setExternalSyncState] = useState<
    { currentTime: number; isPaused: boolean } | undefined
  >(undefined);
  const [localPlayerState, setLocalPlayerState] = useState({
    currentTime: 0,
    isPaused: true,
  });

  // Watch Party States
  const [activeParty, setActiveParty] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // Engagement States
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const vidStr = id.toString();
      const vRes = await fetch(getApiUrl(`video_detail.php?id=${vidStr}`));
      if (!vRes.ok) throw new Error("Video not found or server error");

      const found = await vRes.json();

      if (found) {
        found.url = getMediaUrl(found.file_path);
        setVideo(found);
      }

      const recRes = await fetch(getApiUrl("get_feed.php"));
      if (recRes.ok) {
        const vData = await recRes.json();
        const vids = Array.isArray(vData)
          ? vData.map((v: any) => ({
              ...v,
              url: getMediaUrl(v.file_path),
            }))
          : [];
        setRecommendations(
          vids.filter((v: any) => v.id?.toString() !== vidStr).slice(0, 3),
        );
      }
    } catch (e: any) {
      console.error("Local Sync Failed:", e.message || e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current) {
        setLocalPlayerState({
          currentTime: playerRef.current.getCurrentTime(),
          isPaused: playerRef.current.getIsPaused(),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTestLink = () => {
    if (!video) return;
    setVideo((prev: any) => ({
      ...prev,
      url: STABLE_FALLBACK_URL,
    }));
    toast({
      title: "Diagnostic Mode",
      description:
        "Direct link forced. If playback starts, your SQL registry string format was invalid.",
    });
  };

  const handleInitiateParty = async () => {
    if (!user || !video || !id) return;
    try {
      const res = await fetch(getApiUrl("initiate_party.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: id,
          host_id: user.uid,
          name: `${user.name || "Admin"}'s Mesh Party`,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setActiveParty(data.room_code);
        setIsHost(true);
        setShowConversation(true);
        toast({
          title: "Party Initialized",
          description: `Room Code: ${data.room_code}. Broadcasting to mesh...`,
        });
      }
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Mesh Error",
        description: "Could not initiate watch party.",
      });
    }
  };

  const syncHostState = useCallback(
    async (overrides?: Partial<{ currentTime: number; isPaused: boolean }>) => {
      if (!isHost || !activeParty || !user) return;

      const state = {
        room_code: activeParty,
        host_id: user.uid,
        current_time:
          overrides?.currentTime ?? playerRef.current?.getCurrentTime() ?? 0,
        is_paused:
          overrides?.isPaused ?? playerRef.current?.getIsPaused() ?? true,
      };

      try {
        await fetch(getApiUrl("sync_party.php"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
      } catch (e) {
        console.error("Host Sync Failure");
      }
    },
    [isHost, activeParty, user],
  );

  const handleInteraction = async (
    type: "likes" | "dislikes" | "favorites",
  ) => {
    if (!user || !id) {
      toast({
        title: "Auth Required",
        description: "Sign in to interact with the mesh.",
      });
      return;
    }

    const prevLiked = isLiked;
    const prevDisliked = isDisliked;
    const prevFavorited = isFavorited;

    if (type === "likes") {
      const nextLiked = !prevLiked;
      setIsLiked(nextLiked);
      setVideo((prev: any) => ({
        ...prev,
        likes: nextLiked
          ? (prev.likes || 0) + 1
          : Math.max(0, (prev.likes || 0) - 1),
        dislikes:
          prevDisliked && nextLiked
            ? Math.max(0, (prev.dislikes || 0) - 1)
            : prev.dislikes,
      }));
      if (nextLiked) setIsDisliked(false);
    } else if (type === "dislikes") {
      const nextDisliked = !prevDisliked;
      setIsDisliked(nextDisliked);
      setVideo((prev: any) => ({
        ...prev,
        dislikes: nextDisliked
          ? (prev.dislikes || 0) + 1
          : Math.max(0, (prev.dislikes || 0) - 1),
        likes:
          prevLiked && nextDisliked
            ? Math.max(0, (prev.likes || 0) - 1)
            : prev.likes,
      }));
      if (nextDisliked) setIsLiked(false);
    } else if (type === "favorites") {
      setIsFavorited(!prevFavorited);
    }

    try {
      const res = await fetch(getApiUrl("interact.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, videoId: id, type }),
      });
      if (!res.ok) throw new Error("Interaction rejected by mesh");
    } catch (e) {
      setIsLiked(prevLiked);
      setIsDisliked(prevDisliked);
      setIsFavorited(prevFavorited);
      setVideo((prev: any) => ({
        ...prev,
        likes: prev.likes,
        dislikes: prev.dislikes,
      }));
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Interaction could not be registered.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
        <p className="font-code text-sm tracking-widest text-emerald-500 uppercase animate-pulse">
          Querying Registry...
        </p>
      </div>
    );
  }

  if (!id || !video) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <Users size={40} className="opacity-20" />
          </div>
          <h2 className="text-xl font-headline font-bold text-white uppercase tracking-widest">
            Transmission Not Found
          </h2>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="mt-4 rounded-xl"
          >
            Return to Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex flex-col xl:flex-row gap-6 max-w-[1600px] mx-auto">
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center gap-2 text-[10px] font-code text-emerald-500 uppercase">
                <DatabaseZap size={12} /> SQL Mesh Protocol 3.1
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestLink}
                className="h-7 px-3 rounded-lg text-[9px] font-bold text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Zap size={10} className="mr-1.5" /> TEST DIRECT LINK
              </Button>
            </div>

            <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl group border border-white/5">
              {!isLoading && video?.url ? (
                <CanvasVideoPlayer
                  ref={playerRef}
                  videoUrl={video.url}
                  externalState={externalSyncState}
                  onPlay={() => syncHostState({ isPaused: false })}
                  onPause={() => syncHostState({ isPaused: true })}
                  onSeeked={(time) => syncHostState({ currentTime: time })}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-500" />
                </div>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden bg-zinc-950/50 border border-emerald-500/10">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-code px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                    SQL Sync Mesh
                  </span>
                </div>

                <h1 className="text-3xl font-headline font-bold mb-6 text-white">
                  {video?.title}
                </h1>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-emerald-500/20">
                      <AvatarImage src={video.avatar_url} />
                      <AvatarFallback className="bg-white/5">
                        {video?.author_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-headline font-bold text-lg text-white">
                        {video?.author_name || "Mesh Creator"}
                      </p>
                      <p className="text-xs text-zinc-500">AlgoTube Citizen</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleInteraction("likes")}
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 transition-all duration-300",
                        isLiked
                          ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "bg-white/5 border border-white/10 hover:bg-white/10",
                      )}
                    >
                      <ThumbsUp
                        size={16}
                        className={isLiked ? "fill-emerald-500" : ""}
                      />
                      <span className="text-[10px] font-bold">
                        {video?.likes || 0}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleInteraction("dislikes")}
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 transition-all duration-300",
                        isDisliked
                          ? "text-red-500 bg-red-500/10 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : "bg-white/5 border border-white/10 hover:bg-white/10",
                      )}
                    >
                      <ThumbsDown
                        size={16}
                        className={isDisliked ? "fill-red-500" : ""}
                      />
                      <span className="text-[10px] font-bold">
                        {video?.dislikes || 0}
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleInteraction("favorites")}
                      className={cn(
                        "rounded-2xl h-10 px-4 transition-all duration-300",
                        isFavorited
                          ? "text-yellow-500 bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                          : "bg-white/5 border border-white/10 hover:bg-white/10",
                      )}
                    >
                      <Star
                        size={16}
                        className={isFavorited ? "fill-yellow-500" : ""}
                      />
                    </Button>
                    {!activeParty && (
                      <Button
                        variant="ghost"
                        onClick={handleInitiateParty}
                        className="rounded-2xl gap-2 h-10 px-4 border border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-300"
                      >
                        <Zap size={16} className="fill-emerald-500" />
                        <span className="font-bold text-[10px] uppercase tracking-widest">
                          Start Party
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setShowConversation(!showConversation)}
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 border transition-all duration-300",
                        showConversation
                          ? "border-emerald-500 text-emerald-500 bg-emerald-500/5"
                          : "bg-white/5 border border-white/10",
                      )}
                    >
                      <Users size={16} />
                      <span className="font-bold text-[10px] uppercase tracking-widest">
                        Chat
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="bg-black/40 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-emerald-500 font-code text-[10px]">
                      <Eye size={12} /> SYNCED FROM EDGE
                    </div>
                  </div>
                  <p className="text-zinc-300 leading-relaxed font-body text-sm">
                    {video?.description ||
                      "No encrypted metadata provided for this transmission."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-emerald-500" size={20} />
                <h3 className="text-lg font-headline font-bold uppercase tracking-widest text-white">
                  Mesh Affinity
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          </div>

          {showConversation && (
            <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-500">
              <ConversationPanel
                videoId={id?.toString() as string}
                roomCode={activeParty}
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

export default function VideoDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
          <p className="font-code text-sm tracking-widest text-emerald-500 uppercase animate-pulse">
            Initializing Mesh...
          </p>
        </div>
      }
    >
      <VideoContent />
    </Suspense>
  );
}
