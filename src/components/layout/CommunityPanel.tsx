
"use client";

import React, { useState, useMemo } from 'react';
import { Send, MessageSquare, MoreVertical, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, addDoc, serverTimestamp, doc, increment, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface CommunityPanelProps {
  videoId: string;
}

export default function CommunityPanel({ videoId }: CommunityPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore } = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !videoId) return null;
    return query(
      collection(firestore, 'videos', videoId, 'comments'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, videoId]);

  const { data: comments, isLoading } = useCollection(commentsQuery);

  const handlePostComment = async () => {
    if (!user) {
      toast({ title: "Auth Required", description: "Sign in to join the conversation." });
      return;
    }
    if (!newComment.trim() || !firestore) return;

    setIsSubmitting(true);
    const commentData = {
      videoId,
      userId: user.uid,
      content: newComment,
      createdAt: serverTimestamp(),
      likesCount: 0,
      dislikesCount: 0,
      userName: user.displayName || "Explorer",
      userAvatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`
    };

    try {
      await addDoc(collection(firestore, 'videos', videoId, 'comments'), commentData);
      
      // Update comment count on video
      const videoRef = doc(firestore, 'videos', videoId);
      updateDoc(videoRef, { commentsCount: increment(1) });

      setNewComment('');
      toast({ title: "Comment Posted", description: "Your contribution is live on the mesh." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!firestore || !videoId) return;
    const commentRef = doc(firestore, 'videos', videoId, 'comments', commentId);
    updateDoc(commentRef, { likesCount: increment(1) });
  };

  return (
    <div className="w-80 glass-panel m-4 mt-0 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-500 shadow-2xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="font-headline font-bold text-sm tracking-tight">COMMUNITY HUB</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
          <MoreVertical size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Loader2 className="animate-spin text-accent" />
            <span className="text-[10px] font-code">SYNCING MESH...</span>
          </div>
        ) : comments && comments.length > 0 ? (
          comments.map((c: any) => (
            <div key={c.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="h-8 w-8 rounded-lg border border-white/10">
                <AvatarImage src={c.userAvatar} />
                <AvatarFallback>{c.userName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-accent truncate">{c.userName}</span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "now"}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed font-body break-words">{c.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={() => handleLikeComment(c.id)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-all group/like"
                  >
                    <ThumbsUp size={10} className="group-hover/like:scale-125 transition-transform" /> {c.likesCount || 0}
                  </button>
                  <button className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                    <ThumbsDown size={10} />
                  </button>
                  <button className="text-[10px] text-accent font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    REPLY
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4">
            <MessageSquare size={40} className="mb-2" />
            <p className="text-xs font-headline font-bold">SILENCE IN THE MESH</p>
            <p className="text-[10px] font-body mt-1 italic">Be the first to leave a trace.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-xl">
        <div className="relative group">
          <Input 
            className="pr-10 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10 font-body transition-all"
            placeholder="Contribute to the stack..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            disabled={isSubmitting}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8 disabled:opacity-30"
            disabled={!newComment.trim() || isSubmitting}
            onClick={handlePostComment}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
