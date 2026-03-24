
"use client";

import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, MoreVertical, ThumbsUp, ThumbsDown, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, increment, serverTimestamp, addDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface CommunityPanelProps {
  videoId: string;
}

export default function CommunityPanel({ videoId }: CommunityPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firestore } = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  // Debug log for context tracking
  useEffect(() => {
    console.log('[CommunityPanel] Mounted for videoId:', videoId, 'User:', user?.uid);
  }, [videoId, user]);

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !videoId) return null;
    return query(
      collection(firestore, 'videos', videoId, 'comments'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, videoId]);

  const { data: comments, isLoading } = useCollection(commentsQuery);

  const handlePostComment = async () => {
    console.log('[CommunityPanel] handlePostComment triggered');

    if (isUserLoading) {
      console.log('[CommunityPanel] Still loading auth state...');
      return;
    }

    if (!user) {
      console.log('[CommunityPanel] No user session found');
      toast({ 
        variant: "destructive",
        title: "Auth Required", 
        description: "Sign in to join the conversation on the mesh." 
      });
      return;
    }
    
    if (!newComment.trim()) {
      console.log('[CommunityPanel] Empty comment content');
      return;
    }

    if (!firestore || !videoId) {
      console.error('[CommunityPanel] Missing firestore or videoId context');
      return;
    }

    setIsSubmitting(true);
    
    const commentData = {
      videoId,
      userId: user.uid,
      content: newComment.trim(),
      createdAt: serverTimestamp(),
      likesCount: 0,
      userName: user.displayName || "Explorer",
      userAvatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`
    };

    const commentsColRef = collection(firestore, 'videos', videoId, 'comments');
    const videoRef = doc(firestore, 'videos', videoId);
    
    try {
      console.log('[CommunityPanel] Attempting addDoc to:', commentsColRef.path);
      const docRef = await addDoc(commentsColRef, commentData);
      console.log('[CommunityPanel] addDoc success, ref:', docRef.id);
      
      // Attempt to increment the comment count on the parent video (optional/best-effort)
      updateDoc(videoRef, { commentsCount: increment(1) }).catch(e => {
        console.warn('[CommunityPanel] Failed to update video commentsCount:', e.message);
      });
      
      setNewComment('');
      toast({ 
        title: "Comment Posted", 
        description: "Your contribution is live on the mesh." 
      });
    } catch (e: any) {
      console.error('[CommunityPanel] addDoc failed:', e.message);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `videos/${videoId}/comments`,
        operation: 'create',
        requestResourceData: commentData,
      }));
      
      toast({ 
        variant: "destructive",
        title: "Contribution Failed", 
        description: "The mesh rejected your transmission. Ensure you have permission." 
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <Avatar className="h-8 w-8 rounded-lg border border-white/10 flex-shrink-0">
                <AvatarImage src={c.userAvatar} />
                <AvatarFallback className="bg-white/5 text-[10px]">{c.userName?.[0]}</AvatarFallback>
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
                    onClick={() => {
                      if (!firestore || !videoId) return;
                      const cRef = doc(firestore, 'videos', videoId, 'comments', c.id);
                      updateDoc(cRef, { likesCount: increment(1) }).catch(() => {});
                    }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-all group/like"
                  >
                    <ThumbsUp size={10} className="group-hover/like:scale-125 transition-transform" /> {c.likesCount || 0}
                  </button>
                  <button className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                    <ThumbsDown size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center px-4">
            <MessageSquare size={40} className="mb-2" />
            <p className="text-xs font-headline font-bold uppercase tracking-widest">Silence in the Mesh</p>
            <p className="text-[10px] font-body mt-1 italic">Be the first to leave a trace.</p>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10 backdrop-blur-xl">
        {!user && !isUserLoading ? (
          <div className="flex items-center justify-center p-2 bg-accent/5 rounded-xl border border-accent/10">
            <Lock size={12} className="mr-2 text-accent" />
            <span className="text-[10px] font-code text-accent uppercase font-bold">Sign in to contribute</span>
          </div>
        ) : (
          <div className="relative group">
            <Input 
              className="pr-10 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10 font-body transition-all"
              placeholder="Contribute to the stack..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handlePostComment()}
              disabled={isSubmitting || isUserLoading}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8 disabled:opacity-30"
              disabled={!newComment.trim() || isSubmitting || isUserLoading}
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
