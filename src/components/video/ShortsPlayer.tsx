"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Music,
  Play,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { getApiUrl, getMediaUrl } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface ShortsPlayerProps {
  video: {
    id: string | number;
    url: string;
    title: string;
    author_name: string;
    likesCount?: number;
    dislikesCount?: number;
    description?: string;
  };
}

export default function ShortsPlayer({ video }: ShortsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted] = useState(false);

  // Like/Dislike State
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likesCount || 0);
  const [dislikeCount, setDislikeCount] = useState(video.dislikesCount || 0);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { id: number; user: string; text: string; time: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const currentUserId = user?.uid || null;
  const currentUsername = user?.username || "Guest";

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Load initial chat messages
  useEffect(() => {
    if (showChat) {
      fetch(getApiUrl("get_messages.php", { type: "public", id: video.id }))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setChatMessages(
              data.slice(-20).map((m: any) => ({
                id: m.id,
                user: m.username || "Anonymous",
                text: m.content || m.comment_text || "",
                time: new Date(m.created_at).toLocaleTimeString(),
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [showChat, video.id]);

  const toggleLike = async () => {
    if (!currentUserId) return;

    try {
      const res = await fetch(getApiUrl("likes.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, videoId: video.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked || false);
        if (data.liked) setLikeCount((p) => p + 1);
        else setLikeCount((p) => Math.max(0, p - 1));
        if (disliked) setDisliked(false);
      }
    } catch (e) {
      console.warn("[Shorts] Like failed:", e);
    }
  };

  const toggleDislike = async () => {
    if (!currentUserId) return;

    try {
      const res = await fetch(getApiUrl("dislikes.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, videoId: video.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setDisliked(data.disliked || false);
        if (data.disliked) setDislikeCount((p) => p + 1);
        else setDislikeCount((p) => Math.max(0, p - 1));
        if (liked) setLiked(false);
      }
    } catch (e) {
      console.warn("[Shorts] Dislike failed:", e);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !currentUserId) return;

    const text = chatInput.trim();
    setChatInput("");
    setIsSubmitting(true);

    try {
      const res = await fetch(getApiUrl("send_message.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: video.id,
          user_id: currentUserId,
          content: text,
        }),
      });

      if (res.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            user: currentUsername,
            text,
            time: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (e) {
      console.warn("[Shorts] Chat send failed:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && video.url) {
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.8 },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [video.url]);

  const togglePlay = () => {
    if (!video.url) return;
    if (videoRef.current?.paused) {
      videoRef.current
        .play()
        .catch((e) => console.warn("Shorts Play Blocked", e));
      setIsPlaying(true);
    } else {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const thumbnail = `https://picsum.photos/seed/${video.id}/600/1000`;

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center snap-start relative bg-black"
    >
      <div
        className="absolute inset-0 z-0 opacity-30 blur-[100px] pointer-events-none"
        style={{
          backgroundImage: `url(${thumbnail})`,
          backgroundSize: "cover",
        }}
      />

      <div className="relative z-10 h-full max-h-[85vh] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
        <video
          ref={videoRef}
          {...(video.url ? { src: getMediaUrl(video.url) } : {})}
          className="w-full h-full object-cover cursor-pointer"
          loop
          playsInline
          muted={isMuted}
          onClick={togglePlay}
          crossOrigin="anonymous"
          preload="metadata"
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Play className="text-white fill-white translate-x-1" size={32} />
            </div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-10 w-10 border-2 border-accent pointer-events-auto">
              <AvatarImage
                src={`https://picsum.photos/seed/${video.author_name}/100/100`}
              />
              <AvatarFallback>{video.author_name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pointer-events-auto">
              <h4 className="font-headline font-bold text-sm text-white flex items-center gap-2">
                @{video.author_name}
                <Button
                  variant="ghost"
                  className="h-6 px-2 text-[10px] bg-accent text-background font-bold hover:bg-accent/80 rounded-md"
                >
                  SUBSCRIBE
                </Button>
              </h4>
            </div>
          </div>

          <p className="text-sm text-white/90 font-body mb-3 line-clamp-2 pointer-events-auto">
            {video.title}
          </p>

          <div className="flex items-center gap-2 text-xs text-white/60 font-code animate-pulse">
            <Music size={12} className="text-accent" />
            <span>Original Sound - AlgoTube Audio Engine</span>
          </div>
        </div>

        <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-20">
          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <button
              onClick={toggleLike}
              className={cn(
                "w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all",
                liked
                  ? "bg-accent/30 border-accent/50 shadow-[0_0_15px_rgba(116,222,236,0.3)]"
                  : "bg-white/5 border-white/10 hover:bg-accent/20 hover:border-accent/40",
              )}
            >
              <ThumbsUp
                className={cn(
                  "transition-colors",
                  liked
                    ? "text-accent fill-accent"
                    : "text-white group-hover/btn:text-accent",
                )}
                size={24}
              />
            </button>
            <span className="text-[10px] font-bold text-white">
              {likeCount}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <button
              onClick={toggleDislike}
              className={cn(
                "w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all",
                disliked
                  ? "bg-red-500/30 border-red-500/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10",
              )}
            >
              <ThumbsDown
                className={cn(
                  "transition-colors",
                  disliked ? "text-red-500 fill-red-500" : "text-white",
                )}
                size={24}
              />
            </button>
            <span className="text-[10px] font-bold text-white">
              {dislikeCount || 0}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <button
              onClick={() => setShowChat(true)}
              className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <MessageSquare className="text-white" size={24} />
            </button>
            <span className="text-[10px] font-bold text-white">Chat</span>
          </div>

          <div className="flex flex-col items-center gap-1 group/btn cursor-pointer">
            <button className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
              <Share2 className="text-white" size={24} />
            </button>
            <span className="text-[10px] font-bold text-white">Share</span>
          </div>

          <div className="w-12 h-12 rounded-full border-4 border-white/20 animate-spin-slow overflow-hidden">
            <img
              src={thumbnail}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
        </div>

        {/* Chat Overlay */}
        {showChat && (
          <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-headline font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-accent" />
                Live Chat
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
            >
              {chatMessages.length > 0 ? (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200"
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0 rounded-lg">
                      <AvatarFallback className="text-[8px] bg-accent/20 text-accent">
                        {msg.user[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-accent uppercase">
                          {msg.user}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-code">
                          {msg.time}
                        </span>
                      </div>
                      <p className="text-xs text-white/90 leading-relaxed break-words">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
                  <MessageSquare size={40} className="text-accent mb-2" />
                  <p className="text-xs font-code uppercase tracking-widest text-zinc-500">
                    No messages yet
                  </p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                placeholder="Say something..."
                className="flex-1 bg-white/5 border-white/10 rounded-xl text-sm"
                disabled={isSubmitting}
              />
              <Button
                onClick={handleSendChat}
                disabled={isSubmitting || !chatInput.trim()}
                className="rounded-xl bg-accent hover:bg-accent/80"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
}
