"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getApiUrl } from "@/lib/config";
import { Send, Loader2, Users, DatabaseZap, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ConversationPanelProps {
  videoId: string;
  roomCode?: string | null;
  onSyncState?: (state: { currentTime: number; isPaused: boolean }) => void;
  playerState?: { currentTime: number; isPaused: boolean };
}

export default function ConversationPanel({
  videoId,
  roomCode,
  onSyncState,
  playerState,
}: ConversationPanelProps) {
  const [activeTab, setActiveTab] = useState("public");
  const [rooms, setRooms] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [meshData, setMeshData] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Private Social Layer States
  const [privateRooms, setPrivateRooms] = useState<any[]>([]);
  const [activePrivateRoom, setActivePrivateRoom] = useState<any>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  const { user } = useUser();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const publicScrollRef = useRef<HTMLDivElement>(null);

  // Use a ref for playerState to prevent Effect re-runs every second
  const playerStateRef = useRef(playerState);
  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  const scrollToBottom = useCallback(
    (ref: React.RefObject<HTMLDivElement | null>) => {
      if (ref.current) {
        requestAnimationFrame(() => {
          ref.current!.scrollTop = ref.current!.scrollHeight;
        });
      }
    },
    [],
  );

  // Auto-scroll to bottom on new messages or tab change
  useEffect(() => {
    scrollToBottom(activeTab === "public" ? publicScrollRef : scrollRef);
  }, [meshData, activeTab, scrollToBottom]);

  const loadRooms = useCallback(async () => {
    try {
      const endpoint = getApiUrl(
        `get_rooms.php?video_id=${videoId}&user_id=${user?.uid || 1}`,
      );
      const res = await fetch(endpoint);
      const data = await res.json();

      // Expected JSON structure: { watch_parties: [...], invitations: [...] }
      if (data && data.watch_parties) {
        // Map MySQL data to UI expected structure
        const availableRooms = data.watch_parties.map((wp: any) => ({
          id: wp.room_code,
          name: wp.room_code,
          hostId: wp.host_id,
          status: wp.status,
        }));

        setRooms(availableRooms);

        if (roomCode) {
          const matchingRoom = availableRooms.find(
            (r: any) => r.id === roomCode,
          );
          if (matchingRoom) setCurrentRoom(matchingRoom);
        } else if (!currentRoom && availableRooms.length > 0) {
          setCurrentRoom(availableRooms[0]);
        }
      }
    } catch (e) {
      console.error("Room Sync Failure:", e);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, currentRoom, user?.uid, roomCode]);

  useEffect(() => {
    loadRooms();

    const fetchMesh = async () => {
      let type: "public" | "party" | "private" = "public";
      let id = videoId;

      if (activeTab === "private") {
        if (!currentRoom) return;
        type = "party";
        id = currentRoom.id;
      } else if (activeTab === "private-chat") {
        if (!activePrivateRoom) return;
        type = "private";
        id = activePrivateRoom.room_code;
      }

      try {
        const res = await fetch(
          getApiUrl(`get_messages.php?type=${type}&id=${id}`),
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setMeshData(
            data.map((m: any) => ({
              id: m.id,
              userId: m.user_id,
              userName: m.username,
              userAvatar: m.avatar_url,
              content: m.content || m.comment_text,
              inviteActive: m.invite_link_active == 1,
              createdAt: m.created_at,
            })),
          );
        }
      } catch (e) {
        console.error("Unified Mesh Failure");
      }
    };

    const interval = setInterval(() => {
      fetchMesh();

      if (activeTab === "private" && currentRoom) {
        // Sync Watch Party State & Members
        fetch(getApiUrl(`get_members.php?room_code=${currentRoom.id}`))
          .then((r) => r.json())
          .then((mems) => Array.isArray(mems) && setMembers(mems));

        if (user) {
          fetch(getApiUrl(`sync_party.php?room_code=${currentRoom.id}`))
            .then((r) => r.json())
            .then((syncData) => {
              if (syncData && syncData.host_id !== user.uid && onSyncState) {
                onSyncState({
                  currentTime: syncData.current_time,
                  isPaused: syncData.is_paused == 1,
                });
              }
            });
        }
      }

      if (activeTab === "private-chat" && !activePrivateRoom && user) {
        fetch(getApiUrl(`get_private_rooms.php?user_id=${user.uid}`))
          .then(async (r) => {
            if (r.status === 500 && !isRepairing) {
              setIsRepairing(true);
              await fetch(getApiUrl("migrate_social.php"));
              return [];
            }
            return r.json();
          })
          .then((r) => Array.isArray(r) && setPrivateRooms(r));
      }
    }, 2000);

    fetchMesh();
    return () => clearInterval(interval);
  }, [
    videoId,
    currentRoom?.id,
    activePrivateRoom?.room_code,
    activeTab,
    user?.uid,
    onSyncState,
    loadRooms,
  ]);

  const handleToggleInvite = async (commentId: number, active: boolean) => {
    if (!user) return;
    try {
      const res = await fetch(getApiUrl("toggle_invite.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentId,
          user_id: user.uid,
          active,
        }),
      });
      if (res.ok) {
        setMeshData((prev) =>
          prev.map((m) =>
            m.id === commentId ? { ...m, inviteActive: active } : m,
          ),
        );
        toast({ title: active ? "Invite Activated" : "Invite Revoked" });
      }
    } catch (e) {
      console.error("Toggle Invite Failure", e);
    }
  };

  const handleJoinPrivate = async (targetUserId: string) => {
    if (!user) {
      toast({
        title: "Auth Required",
        description: "Sign in to join private meshes.",
      });
      return;
    }
    try {
      const res = await fetch(getApiUrl("join_private_room.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_a: user.uid, user_b: targetUserId }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setActivePrivateRoom(data);
        setActiveTab("private-chat");
        toast({
          title: "Social Pivot Successful",
          description: "Entering private mesh...",
        });
      }
    } catch (e) {
      console.error("Join Private Failure", e);
    }
  };

  const handlePostMessage = async (isPublic: boolean) => {
    if (!user || !newComment.trim()) return;
    if (!isPublic && !currentRoom && activeTab !== "private-chat") return;

    setIsSubmitting(true);
    const msgData: any = {
      videoId: isPublic ? videoId : undefined,
      roomId: activeTab === "private" ? currentRoom?.id : undefined,
      userId: user.uid,
      userName: user.name || "Explorer",
      userAvatar: `https://picsum.photos/seed/${user.uid}/40/40`,
      content: newComment.trim(),
    };

    setNewComment("");

    try {
      let endpoint = "";
      if (activeTab === "public") endpoint = getApiUrl("send_message.php");
      else if (activeTab === "private")
        endpoint = getApiUrl("send_room_message.php");
      else if (activeTab === "private-chat") {
        endpoint = getApiUrl("send_private_message.php");
        msgData.room_code = activePrivateRoom?.room_code;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgData),
      });
      if (!res.ok) throw new Error("SQL Reject");

      setMeshData((prev) => [
        ...prev,
        {
          ...msgData,
          userName: user.name,
          userAvatar: msgData.userAvatar,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Mesh Error",
        description: "SQL Write Failure.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black rounded-2xl flex flex-col h-full overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.05)] border border-emerald-500/20 animate-in fade-in duration-500">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <div className="p-3 border-b border-emerald-500/10 bg-emerald-950/10 shrink-0">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-950 rounded-xl p-1">
            <TabsTrigger
              value="public"
              className="rounded-lg text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Public
            </TabsTrigger>
            <TabsTrigger
              value="private"
              className="rounded-lg text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Party
            </TabsTrigger>
            <TabsTrigger
              value="private-chat"
              className="rounded-lg text-[10px] uppercase font-bold tracking-widest data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            >
              Direct
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="public"
          className="flex-1 flex flex-col m-0 outline-none overflow-hidden bg-black min-h-0"
        >
          <div
            ref={publicScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black min-h-0"
          >
            {rooms.length > 0 && (
              <div
                onClick={() => setActiveTab("private")}
                className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-emerald-900/30 transition-all animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.15)] mb-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Zap size={18} className="text-white fill-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-headline font-bold text-emerald-400 uppercase tracking-widest">
                      Live Watch Party
                    </p>
                    <p className="text-[9px] text-emerald-500 font-code uppercase">
                      Mesh Event in Progress - Click to Sync
                    </p>
                  </div>
                </div>
                <button className="bg-emerald-500 text-black text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-tighter hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20">
                  Join Mesh
                </button>
              </div>
            )}

            {meshData.length > 0 ? (
              meshData.map((m, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-4 animate-in slide-in-from-bottom-2 duration-300 p-3 rounded-2xl border border-transparent transition-all",
                    m.inviteActive
                      ? "bg-emerald-900/10 border-emerald-500/20 shadow-lg"
                      : "hover:bg-zinc-900",
                  )}
                >
                  <Avatar className="h-9 w-9 rounded-xl">
                    <AvatarImage src={m.userAvatar} />
                    <AvatarFallback className="bg-emerald-600/20 text-emerald-500">
                      {m.userName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span
                        className={cn(
                          "text-[11px] font-bold transition-all uppercase tracking-tight",
                          m.inviteActive
                            ? "text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1.5"
                            : "text-emerald-500/80",
                        )}
                        onClick={() =>
                          m.inviteActive && handleJoinPrivate(m.userId)
                        }
                      >
                        {m.userName}
                        {m.inviteActive && (
                          <Zap size={10} className="fill-emerald-400" />
                        )}
                      </span>
                      <span className="text-[10px] text-zinc-600 uppercase font-code">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </span>
                      {m.userId === user?.uid && (
                        <button
                          onClick={() =>
                            handleToggleInvite(m.id, !m.inviteActive)
                          }
                          className={cn(
                            "text-[8px] px-2 py-0.5 rounded-full border uppercase font-bold transition-all ml-auto tracking-widest",
                            m.inviteActive
                              ? "bg-emerald-600 text-white border-emerald-500/40"
                              : "bg-zinc-900 text-zinc-500 border-zinc-800",
                          )}
                        >
                          {m.inviteActive ? "DISRUPTED" : "INVITE"}
                        </button>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-relaxed font-body",
                        m.inviteActive ? "text-emerald-50" : "text-zinc-300",
                      )}
                    >
                      {m.content}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full opacity-10 text-center">
                <DatabaseZap size={48} className="mb-4 text-emerald-500" />
                <p className="text-[11px] uppercase font-code tracking-[0.2em] text-emerald-500">
                  System Idle - No Feed
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <MessageInput
              onSend={() => handlePostMessage(true)}
              value={newComment}
              onChange={setNewComment}
              disabled={isSubmitting}
              user={user}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="private"
          className="flex-1 flex flex-col m-0 outline-none overflow-hidden bg-black min-h-0"
        >
          {currentRoom ? (
            <>
              <div className="px-4 py-2 border-b border-emerald-500/10 bg-emerald-950/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Zap size={14} className="text-emerald-500" />
                  <span className="text-[11px] font-code text-emerald-400 uppercase font-bold tracking-widest">
                    {currentRoom.name}
                  </span>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter",
                      currentRoom.hostId === user?.uid
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : "bg-emerald-900/40 text-emerald-500/80",
                    )}
                  >
                    {currentRoom.hostId === user?.uid ? "HOST" : "SYNCED"}
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((m, i) => (
                    <Avatar key={i} className="h-6 w-6 border-2 border-black">
                      <AvatarImage src={m.userAvatar} />
                      <AvatarFallback className="text-[8px] bg-emerald-900 text-emerald-500">
                        {m.userName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black min-h-0"
              >
                {meshData.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-4",
                      m.userId === user?.uid ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar className="h-8 w-8 rounded-xl">
                      <AvatarImage src={m.userAvatar} />
                      <AvatarFallback className="text-[10px] bg-zinc-900 text-emerald-500">
                        {m.userName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[75%] p-4 rounded-2xl text-[13px] shadow-lg",
                        m.userId === user?.uid
                          ? "bg-emerald-600 text-white font-medium"
                          : "bg-zinc-900 border border-emerald-500/10 text-zinc-100",
                      )}
                    >
                      <p>{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0">
                <MessageInput
                  onSend={() => handlePostMessage(false)}
                  value={newComment}
                  onChange={setNewComment}
                  disabled={isSubmitting}
                  user={user}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-black gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-950/20 border border-emerald-500/10 flex items-center justify-center">
                <Users size={40} className="text-emerald-500/40" />
              </div>
              <p className="text-[11px] font-headline font-bold uppercase tracking-widest text-emerald-500/60">
                No Active Watch Parties Detected
              </p>
              {user && (
                <Button
                  onClick={() => {
                    fetch(getApiUrl("create_room.php"), {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        video_id: videoId,
                        name: "Emerald Lobby",
                        host_id: user.uid,
                      }),
                    }).then(() => loadRooms());
                  }}
                  className="bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-[11px] px-8 py-6 rounded-2xl shadow-xl shadow-emerald-600/20"
                >
                  INITIALIZE PARTY
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="private-chat"
          className="flex-1 flex flex-col m-0 outline-none overflow-hidden bg-black min-h-0"
        >
          {activePrivateRoom ? (
            <>
              <div className="px-4 py-2 border-b border-emerald-500/10 bg-emerald-950/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-emerald-400">
                  <Shield size={14} />
                  <span className="text-[11px] font-code uppercase font-bold tracking-widest">
                    Secure Mesh Tunnel
                  </span>
                </div>
                <button
                  onClick={() => setActivePrivateRoom(null)}
                  className="text-[10px] uppercase font-bold text-zinc-500 hover:text-emerald-500 transition-colors"
                >
                  Terminate
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black min-h-0">
                {meshData.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-4",
                      m.userId === user?.uid ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <Avatar className="h-8 w-8 rounded-xl">
                      <AvatarImage src={m.userAvatar} />
                      <AvatarFallback className="text-[10px] bg-zinc-900 text-emerald-500">
                        {m.userName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[75%] p-4 rounded-2xl text-[13px] shadow-lg",
                        m.userId === user?.uid
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-zinc-900 border border-emerald-500/20 text-zinc-100",
                      )}
                    >
                      <p>{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0">
                <MessageInput
                  onSend={() => handlePostMessage(false)}
                  value={newComment}
                  onChange={setNewComment}
                  disabled={isSubmitting}
                  user={user}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-black min-h-0">
              <h4 className="text-[10px] uppercase font-bold text-emerald-500/40 mb-6 tracking-[0.3em]">
                Direct Encrypted Channels
              </h4>
              {privateRooms.map((r, i) => (
                <div
                  key={i}
                  onClick={() => setActivePrivateRoom(r)}
                  className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-950/10 cursor-pointer flex items-center justify-between transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-50">
                      {r.room_code}
                    </span>
                  </div>
                  <Shield
                    size={14}
                    className="opacity-20 group-hover:opacity-100 text-emerald-500 transition-all"
                  />
                </div>
              ))}
              {privateRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 opacity-10 text-center">
                  <Shield size={64} className="mb-4 text-emerald-500" />
                  <p className="text-[11px] uppercase font-code tracking-widest text-emerald-500">
                    Vault Empty
                  </p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="p-3 flex items-center justify-center gap-3 border-t border-emerald-500/10 bg-zinc-950">
        <DatabaseZap size={12} className="text-emerald-500/40" />
        <span className="text-[9px] font-code text-emerald-500/40 uppercase tracking-[0.4em]">
          Mesh Integrity: 100% Verified
        </span>
      </div>
    </div>
  );
}

function MessageInput({ onSend, value, onChange, disabled, user }: any) {
  if (!user)
    return (
      <div className="p-4 text-center text-[11px] font-code text-emerald-500/40 uppercase bg-zinc-950 tracking-widest border-t border-emerald-500/10">
        Authentication Required to Pulse
      </div>
    );

  return (
    <div className="p-3 bg-zinc-950 border-t border-emerald-500/10 relative">
      <Input
        className="pr-16 bg-black border-emerald-500/10 focus:border-emerald-500/40 rounded-xl text-sm h-12 text-white placeholder:text-zinc-700 font-body transition-all"
        placeholder="Pulse to mesh..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 hover:bg-emerald-500/10 h-9 w-9 rounded-lg"
        disabled={!value.trim() || disabled}
        onClick={onSend}
      >
        {disabled ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </Button>
    </div>
  );
}
