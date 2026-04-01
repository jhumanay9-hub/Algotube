"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, MessageSquare, Loader2, Users, DatabaseZap, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConversationPanelProps {
  videoId: string;
}

export default function ConversationPanel({ videoId }: ConversationPanelProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Polling logic for room discovery
  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms?videoId=${videoId}`);
      const data = await res.json();
      const availableRooms = Array.isArray(data) ? data : [];
      setRooms(availableRooms);
      
      // Auto-select first room if none selected
      if (!currentRoom && availableRooms.length > 0) {
        setCurrentRoom(availableRooms[0]);
      } else if (!currentRoom && availableRooms.length === 0 && user) {
        // Create default room if none exist
        const createRes = await fetch('/api/chat/rooms', {
          method: 'POST',
          body: JSON.stringify({ videoId, name: 'General Chat', isPrivate: false, creatorId: user.uid })
        });
        const newRoom = await createRes.json();
        if (newRoom.success) loadRooms();
      }
    } catch (e) {
      console.error('Room Sync Failure');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, currentRoom, user]);

  // Polling logic for messages and members
  useEffect(() => {
    if (!currentRoom) {
      loadRooms();
      return;
    }

    const syncRoom = async () => {
      try {
        const [msgRes, memRes] = await Promise.all([
          fetch(`/api/chat/messages?roomId=${currentRoom.id}`),
          fetch(`/api/chat/members?roomId=${currentRoom.id}`)
        ]);
        const msgs = await msgRes.json();
        const mems = await memRes.json();
        
        if (Array.isArray(msgs)) setMessages(msgs);
        if (Array.isArray(mems)) setMembers(mems);
      } catch (e) {
        console.error('Mesh Polling Error');
      }
    };

    syncRoom();
    const interval = setInterval(syncRoom, 3000); // 3s Polling Algorithm
    return () => clearInterval(interval);
  }, [currentRoom, loadRooms]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handlePostMessage = async () => {
    if (!user || !newComment.trim() || !currentRoom) return;
    
    setIsSubmitting(true);
    const msgData = {
      roomId: currentRoom.id,
      userId: user.uid,
      userName: user.displayName || "Explorer",
      userAvatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
      content: newComment.trim()
    };

    setNewComment('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
      if (!res.ok) throw new Error('SQL Reject');
    } catch (e) {
      toast({ variant: "destructive", title: "Mesh Error", description: "SQL Write Failure." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentRoom) {
    return (
      <div className="glass-panel rounded-2xl h-full flex items-center justify-center opacity-50">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[600px] lg:h-full overflow-hidden shadow-2xl border-white/5 animate-in fade-in duration-500">
      {/* Header with Participants */}
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-accent" />
            <span className="text-[10px] font-headline font-bold uppercase tracking-widest">{currentRoom.name}</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-code text-accent/40">
            <DatabaseZap size={10} /> TURSO POLLING ACTIVE
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <div className="flex -space-x-2">
            {members.map((m, i) => (
              <Avatar key={i} className="h-6 w-6 border-2 border-background ring-1 ring-accent/20">
                <AvatarImage src={m.userAvatar} />
                <AvatarFallback className="text-[8px]">{m.userName?.[0]}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground ml-2 font-code">
            {members.length} participating
          </span>
        </div>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
        {messages.map((m, idx) => (
          <div key={idx} className={cn(
            "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
            m.userId === user?.uid ? "flex-row-reverse" : "flex-row"
          )}>
            <Avatar className="h-7 w-7 rounded-lg">
              <AvatarImage src={m.userAvatar} />
              <AvatarFallback>{m.userName?.[0]}</AvatarFallback>
            </Avatar>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl text-xs font-body",
              m.userId === user?.uid 
                ? "bg-accent text-background font-bold rounded-tr-none" 
                : "bg-white/5 border border-white/10 text-foreground/90 rounded-tl-none"
            )}>
              {m.userId !== user?.uid && <p className="text-[9px] font-bold text-accent mb-1 opacity-80">{m.userName}</p>}
              <p className="leading-relaxed">{m.content}</p>
              <p className="text-[8px] opacity-40 mt-1 text-right">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        {!user ? (
          <Button variant="outline" className="w-full text-[10px] font-bold uppercase tracking-widest h-10 border-accent/20 text-accent">
            JOIN MESH TO CONVERSE
          </Button>
        ) : (
          <div className="relative">
            <Input 
              className="pr-12 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-11"
              placeholder="Post to transmission conversation..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostMessage()}
              disabled={isSubmitting}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8"
              disabled={!newComment.trim() || isSubmitting}
              onClick={handlePostMessage}
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
