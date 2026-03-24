
"use client";

import React, { useState } from 'react';
import { Send, MessageSquare, MoreVertical, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

const MOCK_COMMENTS = [
  { id: 1, user: 'KernelPanic', avatar: 'https://picsum.photos/seed/k/40/40', text: 'The logic on the prefix tree implementation is solid.', likes: 42, time: '2h ago' },
  { id: 2, user: 'RootShell', avatar: 'https://picsum.photos/seed/r/40/40', text: 'Is there a way to bypass the encryption overlay for debugging?', likes: 12, time: '5h ago' },
  { id: 3, user: 'CyberPunker', avatar: 'https://picsum.photos/seed/c/40/40', text: 'Best explanation of zero trust I\'ve seen so far.', likes: 128, time: '1d ago' },
];

export default function CommunityPanel() {
  const [comment, setComment] = useState('');

  return (
    <div className="w-80 glass-panel m-4 mt-0 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-8 duration-500">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="font-headline font-bold text-sm tracking-tight">COMMUNITY HUB</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {MOCK_COMMENTS.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={c.avatar} />
              <AvatarFallback>{c.user[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-accent">{c.user}</span>
                <span className="text-[10px] text-muted-foreground">{c.time}</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed font-body">{c.text}</p>
              <div className="flex items-center gap-3 mt-2">
                <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors">
                  <ThumbsUp size={10} /> {c.likes}
                </button>
                <button className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                  <ThumbsDown size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative">
          <Input 
            className="pr-10 bg-black/20 border-white/5 focus:border-accent/40 rounded-xl text-xs h-10"
            placeholder="Contribute to the stack..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-1 top-1/2 -translate-y-1/2 text-accent hover:bg-accent/10 h-8 w-8"
            disabled={!comment}
          >
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
