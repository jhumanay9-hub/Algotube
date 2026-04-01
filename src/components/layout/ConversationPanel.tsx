
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, Users, DatabaseZap, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConversationPanelProps {
  videoId: string;
  onSyncState?: (state: { currentTime: number; isPaused: boolean }) => void;
  playerState?: { currentTime: number; isPaused: boolean };
}

export default function ConversationPanel({ videoId, onSyncState, playerState }: ConversationPanelProps) {
  const [activeTab, setActiveTab] = useState('public');
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const publicScrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  };

  const loadPublicMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?videoId=${videoId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPublicMessages(data);
    } catch (e) {
      console.error('Public Mesh Failure');
    }
  }, [videoId]);

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/rooms?videoId=${videoId}`);
      const data = await res.json();
      const availableRooms = Array.isArray(data) ? data : [];
      setRooms(availableRooms);
      
      if (!currentRoom && availableRooms.length > 0) {
        setCurrentRoom(availableRooms[0]);
      }
    } catch (e) {
      console.error('Room Sync Failure');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, currentRoom]);

  useEffect(() => {
    loadPublicMessages();
    loadRooms();

    const interval = setInterval(() => {
      loadPublicMessages();
      if (currentRoom) {
        fetch(`/api/chat/messages?roomId=${currentRoom.id}`).then(r => r.json()).then(msgs => {
          if (Array.isArray(msgs)) {
            setMessages(msgs);
            scrollToBottom(scrollRef);
          }
        });
        
        fetch(`/api/chat/members?roomId=${currentRoom.id}`).then(r => r.json()).then(mems => {
          if (Array.isArray(mems)) setMembers(mems);
        });

        if (activeTab === 'private' && user) {
          fetch(`/api/watch-party?roomId=${currentRoom.id}`).then(r => r.json()).then(syncData => {
            if (syncData && syncData.leaderId !== user.uid && onSyncState) {
              onSyncState({ 
                currentTime: syncData.currentTime, 
                isPaused: syncData.isPaused === 1 || syncData.isPaused === true 
              });
            } else if ((!syncData || syncData.leaderId === user.uid) && playerState) {
              fetch('/api/watch-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  roomId: currentRoom.id,
                  leaderId: user.uid,
                  currentTime: playerState.currentTime,
                  isPaused: playerState.isPaused
                })
              });
            }
          });
        }
      }
    }, 2000); 

    return () => clearInterval(interval);
  }, [videoId, currentRoom, user, activeTab, playerState, onSyncState, loadPublicMessages, loadRooms]);

  useEffect(() => {
    scrollToBottom(activeTab === 'public' ? publicScrollRef : scrollRef);
  }, [publicMessages, messages, activeTab]);

  const handlePostMessage = async (isPublic: boolean) => {
    if (!user || !newComment.trim()) return;
    if (!isPublic && !currentRoom) return;
    
    setIsSubmitting(true);
    const msgData = {
      videoId: isPublic ? videoId : undefined,
      roomId: !isPublic ? currentRoom.id : undefined,
      userId: user.uid,
      userName: user.displayName || "Explorer",
      userAvatar: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
      content: newComment.trim()
    };

    setNewComment('');

    try {
      const endpoint = isPublic ? '/api/messages' : '/api/chat/messages';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgData)
      });
      if (!res.ok) throw new Error('SQL Reject');
      if (isPublic) loadPublicMessages();
    } catch (e) {
      toast({ variant: "destructive", title: "Mesh Error", description: "SQL Write Failure." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[600px] lg:h-full overflow-hidden shadow-2xl border-white/5 animate-in fade-in duration-500">
      <Tabs defaultValue="public" className="flex flex-col h-full" onValueChange={setActiveTab}>
        <div className="p-4 border-b border-white/10 bg-white/5">
          <TabsList className="grid w-full grid-cols-2 bg-black/40 rounded-xl p-1">
            <TabsTrigger value="public" className="rounded-lg text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-accent data-[state=active]:text-background">Public</TabsTrigger>
            <TabsTrigger value="private" className="rounded-lg text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-accent data-[state=active]:text-background">Watch Party</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="public" className="flex-1 flex flex-col m-0 outline-none overflow-hidden">
          <div ref={publicScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
            {publicMessages.length > 0 ? publicMessages.map((m, idx) => (
              <div key={idx} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarImage src={m.userAvatar} />
                  <AvatarFallback>{m.userName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-accent">{m.userName}</span>
                    <span className="text-[8px] text-muted-foreground uppercase">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-foreground/80 leading-relaxed font-body">{m.content}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                <p className="text-[10px] uppercase font-code">No transmissions detected</p>
              </div>
            )}
          </div>
          <MessageInput onSend={() => handlePostMessage(true)} value={newComment} onChange={setNewComment} disabled={isSubmitting} user={user} />
        </TabsContent>

        <TabsContent value="private" className="flex-1 flex flex-col m-0 outline-none overflow-hidden">
          {currentRoom ? (
            <>
              <div className="px-4 py-2 border-b border-white/5 bg-accent/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={12} className="text-accent" />
                  <span className="text-[9px] font-code text-accent uppercase font-bold">{currentRoom.name} SYNC</span>
                </div>
                <div className="flex -space-x-1.5">
                  {members.slice(0, 4).map((m, i) => (
                    <Avatar key={i} className="h-5 w-5 border border-background">
                      <AvatarImage src={m.userAvatar} />
                      <AvatarFallback className="text-[6px]">{m.userName?.[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                  {members.length > 4 && (
                    <div className="w-5 h-5 rounded-full bg-accent/20 border border-background flex items-center justify-center text-[6px] font-bold text-accent">
                      +{members.length - 4}
                    </div>
                  )}
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
                {messages.length > 0 ? messages.map((m, idx) => (
                  <div key={idx} className={cn("flex gap-3", m.userId === user?.uid ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className="h-6 w-6 rounded-md">
                      <AvatarImage src={m.userAvatar} />
                      <AvatarFallback className="text-[8px]">{m.userName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "max-w-[80%] p-2.5 rounded-xl text-[11px]",
                      m.userId === user?.uid ? "bg-accent text-background font-bold shadow-lg" : "bg-white/5 border border-white/10"
                    )}>
                      <p>{m.content}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-20 text-center">
                    <p className="text-[10px] uppercase font-code">Room is empty</p>
                  </div>
                )}
              </div>
              <MessageInput onSend={() => handlePostMessage(false)} value={newComment} onChange={setNewComment} disabled={isSubmitting} user={user} />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-30 gap-4">
              <Users size={48} />
              <p className="text-[10px] font-headline font-bold uppercase tracking-widest">No watch parties initiated</p>
              {user && (
                <Button 
                  onClick={() => {
                    fetch('/api/chat/rooms', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ videoId, name: 'Main Lobby', creatorId: user.uid })
                    }).then(() => loadRooms());
                  }}
                  className="bg-accent text-background font-bold text-[10px] px-6 rounded-full"
                >
                  START PARTY
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="p-2 flex items-center justify-center gap-2 border-t border-white/5 bg-black/40">
        <DatabaseZap size={10} className="text-accent/40" />
        <span className="text-[8px] font-code text-accent/40 uppercase tracking-widest">SQL Mesh Polling Active</span>
      </div>
    </div>
  );
}

function MessageInput({ onSend, value, onChange, disabled, user }: any) {
  if (!user) return <div className="p-4 text-center text-[10px] font-code text-muted-foreground uppercase bg-white/5">Sign in to participate</div>;
  
  return (
    <div className="p-4 bg-white/5 border-t border-white/10 relative">
      <Input 
        className="pr-12 bg-black/40 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10"
        placeholder="Broadcast to mesh..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSend()}
        disabled={disabled}
      />
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute right-5 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8"
        disabled={!value.trim() || disabled}
        onClick={onSend}
      >
        {disabled ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="size-4" />}
      </Button>
    </div>
  );
}
