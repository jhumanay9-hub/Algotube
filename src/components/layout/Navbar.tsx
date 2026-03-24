
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, User, Upload, Shield, LogIn, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VideoTrie } from '@/lib/trie';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { UploadModal } from '@/components/video/UploadModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/trending');
  };

  const trie = useMemo(() => {
    const vTrie = new VideoTrie();
    MOCK_VIDEOS.forEach(v => {
      const words = [...v.title.split(' '), ...v.tags];
      words.forEach(word => vTrie.insert(word, v.id));
    });
    return vTrie;
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const videoIds = trie.search(searchQuery);
      const matchedTitles = MOCK_VIDEOS
        .filter(v => videoIds.includes(v.id))
        .map(v => v.title)
        .slice(0, 5);
      setSuggestions(matchedTitles);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, trie]);

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b-0 m-4 rounded-2xl px-6 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:neon-glow transition-all">
          <Shield className="text-accent" size={24} />
        </div>
        <span className="font-headline font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
          AlgoTube
        </span>
      </Link>

      <div className="flex-1 max-w-2xl px-12 relative">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={18} />
          <Input 
            className="w-full pl-10 bg-white/5 border-white/10 focus:border-accent/50 focus:ring-accent/20 rounded-xl font-body"
            placeholder="Search creators and content..."
            search-hint="video content"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-12 right-12 mt-2 glass-panel border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
            {suggestions.map((s, idx) => (
              <button 
                key={idx}
                className="w-full text-left px-4 py-3 hover:bg-accent/10 hover:text-accent transition-colors border-b border-white/5 last:border-0 font-body text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl">
              <Bell size={20} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0.5 w-10 h-10 rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
                  <Avatar className="w-full h-full rounded-[inherit]">
                    <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} />
                    <AvatarFallback>{user.displayName?.[0] || user.email?.[0]}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-panel border-white/10 mt-2 min-w-[200px]" align="end">
                <DropdownMenuLabel className="font-headline">{user.displayName || "Explorer"}</DropdownMenuLabel>
                <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">{user.email}</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer">Profile Settings</DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer">My Studio</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem 
                  className="text-destructive hover:bg-destructive/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer" 
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth">
              <Button variant="outline" className="hidden sm:flex items-center gap-2 rounded-xl border-accent/30 text-accent hover:bg-accent hover:text-background font-bold transition-all">
                <LogIn size={18} /> SIGN IN
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl border border-white/10 hover:border-accent/40 bg-white/5 sm:hidden">
                  <User size={20} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-panel border-white/10 mt-2 min-w-[200px]" align="end">
                <DropdownMenuLabel className="font-headline">Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <Link href="/auth">
                  <DropdownMenuItem className="hover:bg-accent/10 cursor-pointer flex items-center gap-2 font-bold text-accent">
                    <LogIn size={16} /> Sign In
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </nav>
  );
}
