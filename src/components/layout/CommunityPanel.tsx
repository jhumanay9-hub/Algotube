"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/config";
import { Send, MessageSquare, Loader2, Lock, DatabaseZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CommunityPanelProps {
  videoId: string;
}

/**
 * CommunityPanel - Turso SQL Messaging
 * Handles community chat via prepared SQL statements.
 */
export default function CommunityPanel({ videoId }: CommunityPanelProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl(`messages?videoId=${videoId}`));
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("SQL Message Fetch Failure");
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);

    // Optimistic state
    const commentData = {
      videoId,
      userId: user.uid,
      userName: user.name || "Explorer",
      userAvatar: `https://picsum.photos/seed/${user.uid}/40/40`,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    };

    setComments((prev) => [commentData, ...prev]);
    const cachedInput = newComment;
    setNewComment("");

    try {
      const res = await fetch(getApiUrl("messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });

      if (!res.ok) throw new Error("SQL Write Failure");

      toast({
        title: "Message Broadcasted",
        description: "Persisted to SQL mesh.",
      });
    } catch (e) {
      // Rollback optimistic state
      setComments((prev) => prev.filter((c) => c !== commentData));
      setNewComment(cachedInput);
      toast({
        variant: "destructive",
        title: "Mesh Error",
        description: "SQL write rejected.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[500px] lg:h-full overflow-hidden shadow-2xl border-white/5">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="font-headline font-bold text-xs tracking-tight uppercase">
            SQL Community Hub
          </h3>
        </div>
        <div className="text-[8px] font-code text-accent/50 flex items-center gap-1">
          <DatabaseZap size={10} /> TURSO ACTIVE
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Loader2 className="animate-spin text-accent" />
            <span className="text-[10px] font-code uppercase">
              QUERYING SQL NODES...
            </span>
          </div>
        ) : comments.length > 0 ? (
          comments.map((c, idx) => (
            <div
              key={idx}
              className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                <AvatarImage src={c.userAvatar} />
                <AvatarFallback>{c.userName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent">
                    {c.userName}
                  </span>
                  <span className="text-[9px] text-muted-foreground uppercase">
                    {new Date(c.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed font-body">
                  {c.content}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-[10px] font-headline font-bold uppercase">
              Mesh silence
            </p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10">
        {!user ? (
          <div className="flex items-center justify-center p-2 bg-accent/5 rounded-xl border border-accent/10">
            <Lock size={12} className="mr-2 text-accent" />
            <span className="text-[10px] font-code text-accent uppercase font-bold text-center">
              Join to message the mesh
            </span>
          </div>
        ) : (
          <div className="relative group">
            <Input
              className="pr-10 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10"
              placeholder="Post to SQL mesh..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8"
              disabled={!newComment.trim() || isSubmitting}
              onClick={handlePostComment}
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
