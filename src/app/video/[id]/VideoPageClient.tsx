"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getApiUrl, getMediaUrl } from "@/lib/config";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ConversationPanel from "@/components/layout/ConversationPanel";
import CanvasVideoPlayer from "@/components/video-player/CanvasVideoPlayer";
import VideoCard from "@/components/video-card/VideoCard";
import { useUser } from "@/context/AuthContext";
import { useSubscriptions } from "@/context/SubscriptionContext";
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
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STABLE_FALLBACK_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function VideoPageClient() {
  const { id } = useParams();
  const { user } = useUser();
  const { toast } = useToast();
  const { isSubscribed, toggleSubscription, refreshSubscriptions } =
    useSubscriptions();
  const playerRef = useRef<any>(null);

  const [video, setVideo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showConversation, setShowConversation] = useState(true);
  const [externalSyncState, setExternalSyncState] = useState<any>(null);
  const [localPlayerState, setLocalPlayerState] = useState({
    currentTime: 0,
    isPaused: true,
  });

  // Engagement States
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    // Type Safety: Validate id parameter before fetch
    const vidStr = id?.toString();
    if (!vidStr || vidStr === "undefined" || vidStr === "null") {
      console.error("[VideoPageClient] Invalid video ID:", id);
      toast({
        variant: "destructive",
        title: "Invalid Video ID",
        description: "The video ID parameter is missing or invalid.",
      });
      setIsLoading(false);
      return;
    }

    console.log(`[VideoPageClient] Fetching video details for ID: ${vidStr}`);

    try {
      // URL Normalization: Use video_detail.php endpoint with proper URL construction
      const videoDetailUrl = getApiUrl("video_detail.php", { id: vidStr });
      console.log(`[VideoPageClient] Video Detail URL: ${videoDetailUrl}`);

      // Fetch video details first
      let vRes;
      try {
        vRes = await fetch(videoDetailUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "omit",
        });
        console.log(`[VideoPageClient] Video response status: ${vRes.status}`);
      } catch (fetchError) {
        console.error("[VideoPageClient] Video fetch failed:", fetchError);
        throw new Error(
          `Failed to fetch video details: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
        );
      }

      if (!vRes.ok) {
        const errorData = await vRes.json().catch(() => null);
        throw new Error(
          `Video fetch failed with status ${vRes.status}: ${errorData?.error || errorData?.message || vRes.statusText}`,
        );
      }

      const found = await vRes.json();
      console.log("[VideoPageClient] Raw API Response:", found);

      if (found && found.id) {
        // DATA SANITIZATION: Aggressively .trim() and validate the transmission URL
        let videoUrl = (found.url || found.file_path || "").toString().trim();

        const isInvalid =
          !videoUrl ||
          videoUrl === "undefined" ||
          videoUrl === "" ||
          videoUrl.includes("placeholder.com") ||
          videoUrl.includes("picsum.photos");

        if (isInvalid) {
          console.warn("[VideoPageClient] Invalid video URL, using fallback");
          videoUrl = STABLE_FALLBACK_URL;
        }
        found.url = videoUrl;
      }

      console.log("[VideoPageClient] Processed Video Data:", found);
      setVideo(found || null);
      setRecommendations([]);

      // Fetch engagement states separately to avoid cascading failures
      if (user && user.uid) {
        try {
          console.log(
            `[VideoPageClient] Fetching engagement states for user: ${user.uid}, video: ${vidStr}`,
          );

          const [lRes, dRes, fRes] = await Promise.all([
            fetch(
              getApiUrl("likes.php", { userId: user.uid, videoId: vidStr }),
              { credentials: "omit" },
            ).then((r) => {
              if (!r.ok) throw new Error(`Likes HTTP ${r.status}`);
              return r.json();
            }),
            fetch(
              getApiUrl("dislikes.php", { userId: user.uid, videoId: vidStr }),
              { credentials: "omit" },
            ).then((r) => {
              if (!r.ok) throw new Error(`Dislikes HTTP ${r.status}`);
              return r.json();
            }),
            fetch(
              getApiUrl("favorites.php", { userId: user.uid, videoId: vidStr }),
              { credentials: "omit" },
            ).then((r) => {
              if (!r.ok) throw new Error(`Favorites HTTP ${r.status}`);
              return r.json();
            }),
          ]);

          console.log("[VideoPageClient] Engagement states:", {
            liked: lRes.active,
            disliked: dRes.active,
            favorited: fRes.active,
          });
          setIsLiked(lRes.active === true);
          setIsDisliked(dRes.active === true);
          setIsFavorited(fRes.active === true);
        } catch (engagementError) {
          console.warn(
            "[VideoPageClient] Failed to fetch engagement states (non-critical):",
            engagementError,
          );
          // Don't fail the whole page load for engagement states
        }
      }
    } catch (e: any) {
      // Error Handling: Log full error object to diagnose CORS vs 404 vs other issues
      console.error("[VideoPageClient] Mesh Sync Failed - Full Error:", e);
      console.error("[VideoPageClient] Error Details:", {
        message: e.message,
        name: e.name,
        stack: e.stack,
        type: e.type,
        cause: e.cause,
        isNetworkError:
          e.message?.includes("fetch") || e.message?.includes("network"),
        isCorsError: e.message?.includes("CORS") || e.message?.includes("cors"),
        is404: e.message?.includes("404"),
      });

      toast({
        variant: "destructive",
        title: "Mesh Sync Failed",
        description:
          e.message || "Failed to load video data. Check console for details.",
      });

      setVideo(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, user, toast]);

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

  const handleInteraction = async (
    type: "likes" | "dislikes" | "favorites",
  ) => {
    if (!user) {
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
      const nextLiked = !isLiked;
      setIsLiked(nextLiked);
      if (nextLiked) setIsDisliked(false);
    } else if (type === "dislikes") {
      const nextDisliked = !isDisliked;
      setIsDisliked(nextDisliked);
      if (nextDisliked) setIsLiked(false);
    } else if (type === "favorites") {
      setIsFavorited(!isFavorited);
    }

    try {
      const res = await fetch(getApiUrl(`${type}.php`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, videoId: id }),
      });

      if (!res.ok) throw new Error("Interaction rejected");

      const data = await res.json();
      if (type === "likes") setIsLiked(data.active);
      if (type === "dislikes") setIsDisliked(data.active);
      if (type === "favorites") setIsFavorited(data.active);
    } catch (e) {
      setIsLiked(prevLiked);
      setIsDisliked(prevDisliked);
      setIsFavorited(prevFavorited);
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Registry synchronization failure.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-background">
        <Loader2 className="animate-spin text-accent" size={48} />
        <p className="font-code text-sm tracking-widest text-accent uppercase animate-pulse">
          Querying Registry...
        </p>
      </div>
    );
  }

  if (!video) {
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
        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar flex flex-col xl:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6">
            {/* DIAGNOSTIC TEST BAR */}
            <div className="flex items-center justify-between px-4 py-2 bg-accent/5 border border-accent/20 rounded-2xl">
              <div className="flex items-center gap-2 text-[10px] font-code text-accent uppercase">
                <DatabaseZap size={12} /> SQL Mesh Protocol 3.1
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestLink}
                className="h-7 px-3 rounded-lg text-[9px] font-bold text-accent border border-accent/30 hover:bg-accent/10"
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
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-accent" />
                </div>
              )}
            </div>

            <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-accent/20 text-accent text-[9px] font-code px-2 py-0.5 rounded-full border border-accent/30 uppercase">
                    SQL Sync Mesh
                  </span>
                </div>

                <h1 className="text-3xl font-headline font-bold mb-6">
                  {video?.title}
                </h1>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-accent/20">
                      <AvatarFallback className="bg-white/5">
                        {video?.author_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-headline font-bold text-lg">
                        {video?.author_name || "Mesh Creator"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AlgoTube Citizen
                      </p>
                    </div>
                    {/* Dynamic Subscribe Button */}
                    {user && user.uid !== video?.user_id?.toString() && (
                      <Button
                        onClick={async () => {
                          const creatorId = video?.user_id;
                          if (!creatorId) return;

                          const newState = await toggleSubscription(creatorId);
                          if (newState) {
                            toast({
                              title: "Subscribed!",
                              description: `You're now following ${video?.author_name}`,
                            });
                          } else {
                            toast({
                              title: "Unsubscribed",
                              description: `You've unfollowed ${video?.author_name}`,
                            });
                          }
                        }}
                        className={cn(
                          "rounded-xl gap-2 h-9 px-4 transition-all duration-300 font-bold text-xs",
                          isSubscribed(video?.user_id)
                            ? "bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20"
                            : "bg-accent text-background hover:bg-accent/90",
                        )}
                      >
                        {isSubscribed(video?.user_id) ? (
                          <>
                            <UserCheck size={14} />
                            Subscribed
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            Subscribe
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => handleInteraction("likes")}
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 transition-all duration-300",
                        isLiked
                          ? "text-accent bg-accent/10 border border-accent/30 shadow-[0_0_10px_rgba(116,222,236,0.2)]"
                          : "bg-white/5 border border-white/10 hover:bg-white/10",
                      )}
                    >
                      <ThumbsUp
                        size={16}
                        className={isLiked ? "fill-accent" : ""}
                      />
                      <span className="text-[10px] font-bold">
                        {video?.likesCount || 0}
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
                        {video?.dislikesCount || 0}
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
                    <Button
                      variant="ghost"
                      onClick={() => setShowConversation(!showConversation)}
                      className={cn(
                        "rounded-2xl gap-2 h-10 px-4 border transition-all duration-300",
                        showConversation
                          ? "border-accent text-accent bg-accent/5"
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

                <div className="bg-black/20 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-accent font-code text-[10px]">
                      <Eye size={12} /> SYNCED FROM EDGE
                    </div>
                  </div>
                  <p className="text-foreground/80 leading-relaxed font-body text-sm">
                    {video?.description ||
                      "No encrypted metadata provided for this transmission."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-12">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-accent" size={20} />
                <h3 className="text-lg font-headline font-bold uppercase tracking-widest">
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
            <div className="w-full xl:w-[450px] shrink-0 animate-in slide-in-from-right-4 duration-500">
              <div className="sticky top-4 min-h-[600px] h-[calc(100vh-140px)]">
                <ConversationPanel
                  videoId={id?.toString() as string}
                  onSyncState={setExternalSyncState}
                  playerState={localPlayerState}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
