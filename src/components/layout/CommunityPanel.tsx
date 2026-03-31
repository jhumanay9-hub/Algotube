
"use client";

import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, MoreVertical, ThumbsUp, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getB2Comments, postB2Comment } from '@/app/actions/b2-store';

interface CommunityPanelProps {
  videoId: string;
}

export default function CommunityPanel({ videoId }: CommunityPanelProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    async function loadComments() {
      setIsLoading(true);
      const data = await getB2Comments(videoId);
      setComments(data);
      setIsLoading(false);
    }
    loadComments();
  }, [videoId]);

  const handlePostComment = async () => {
    if (!user || !newComment.trim()) return;
    
    setIsSubmitting(true);
    const commentData = {
      content: newComment.trim(),
      userName: user.displayName || "Explorer",
      userAvatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
      createdAt: new Date().toISOString(),
      likesCount: 0
    };

    try {
      await postB2Comment(videoId, commentData);
      setComments(prev => [commentData, ...prev]);
      setNewComment('');
      toast({ title: "Mesh Sync Successful", description: "Comment persisted to B2 storage." });
    } catch (e) {
      toast({ variant: "destructive", title: "Transmission Failed", description: "B2 node rejected the write." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-80 glass-panel m-4 mt-0 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="font-headline font-bold text-xs tracking-tight uppercase">B2 Community Hub</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Loader2 className="animate-spin text-accent" />
            <span className="text-[10px] font-code">FETCHING B2 MANIFEST...</span>
          </div>
        ) : comments.length > 0 ? (
          comments.map((c, idx) => (
            <div key={idx} className="flex gap-3 animate-in fade-in duration-300">
              <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                <AvatarImage src={c.userAvatar} />
                <AvatarFallback>{c.userName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent">{c.userName}</span>
                  <span className="text-[9px] text-muted-foreground uppercase">{new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed font-body">{c.content}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
            <MessageSquare size={32} className="mb-2" />
            <p className="text-[10px] font-headline font-bold uppercase">Mesh silence</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10">
        {!user ? (
          <div className="flex items-center justify-center p-2 bg-accent/5 rounded-xl border border-accent/10">
            <Lock size={12} className="mr-2 text-accent" />
            <span className="text-[10px] font-code text-accent uppercase font-bold">B2 Write Locked (Guest)</span>
          </div>
        ) : (
          <div className="relative group">
            <Input 
              className="pr-10 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10"
              placeholder="Post to B2 mesh..."
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
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
