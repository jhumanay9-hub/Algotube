"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Upload,
  Shield,
  LogOut,
  Menu,
  UserCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadModal } from "@/components/video/UploadModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Sidebar from "./Sidebar";
import { useSearch } from "@/hooks/use-search";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getApiUrl, getMediaUrl } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const displayName = user?.username || "Guest";
  const displayEmail = user?.email || "";
  const avatarUrl = getMediaUrl("/avatars/default.png");

  const { results, isSearching } = useSearch(searchQuery, allVideos);

  useEffect(() => {
    async function load() {
      try {
        console.log("[Navbar] Fetching feed from:", getApiUrl("get_feed.php"));
        const res = await fetch(getApiUrl("get_feed.php"));

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("[Navbar] Feed response:", data);

        // Map XAMPP payload to the older Video schema structure the components expect
        const mappedData = Array.isArray(data)
          ? data.map((v) => ({
              ...v,
              url: v.file_path,
              creator: v.author_name || "Local Upload",
              thumbnail: getMediaUrl(v.thumbnail_path),
            }))
          : [];
        setAllVideos(mappedData);
      } catch (err: any) {
        console.error("[Navbar] Fetch error details:", err.message);
        if (err.name === "TypeError" && err.message.includes("fetch")) {
          console.error(
            "[Navbar] Network/CORS error - likely IPv6 or CORS handshake failure",
          );
        }
        setAllVideos([]); // Prevent UI crash
      }
    }
    load();
  }, []);

  const handleLogout = async () => {
    signOut();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass-panel border-b-0 m-4 rounded-2xl px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-muted-foreground hover:text-accent"
            >
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 border-none bg-transparent w-72 overflow-y-auto"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <Sidebar isMobile />
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center group-hover:neon-glow transition-all">
            <Shield className="text-accent" size={24} />
          </div>
          <span className="font-headline font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-accent bg-clip-text text-transparent hidden sm:block">
            AlgoTube
          </span>
        </Link>
      </div>

      <div className="flex-1 max-w-2xl px-4 sm:px-12 relative">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
              isSearching
                ? "animate-pulse text-accent"
                : "group-focus-within:text-accent",
            )}
            size={18}
          />
          <Input
            className="w-full pl-10 bg-white/5 border-white/10 focus:border-accent/50 focus:ring-accent/20 rounded-xl font-body"
            placeholder="Search the mesh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
        </form>

        {showSuggestions && (results.length > 0 || isSearching) && (
          <div className="absolute top-full left-4 right-4 sm:left-12 sm:right-12 mt-2 glass-panel border border-white/10 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 shadow-2xl z-[60]">
            <ScrollArea className="max-h-[400px]">
              {isSearching ? (
                <div className="p-4 flex items-center justify-center gap-2 text-xs font-code text-accent animate-pulse">
                  <Loader2 size={14} className="animate-spin" /> ANALYZING
                  PREFIXES...
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {results.map((res, idx) => (
                    <button
                      key={`${res.video.id}-${idx}`}
                      onClick={() => {
                        router.push(`/video/${res.video.id}`);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left group"
                    >
                      <div className="w-20 aspect-video rounded-md bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                        <img
                          src={res.video.thumbnail}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          alt=""
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate group-hover:text-accent transition-colors">
                          {res.video.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {res.video.creator}
                          </span>
                          {res.isFuzzy && (
                            <span className="text-[9px] font-code bg-accent/10 text-accent px-1.5 rounded uppercase">
                              Fuzzy Match
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload size={20} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-xl hidden sm:flex"
        >
          <Bell size={20} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="p-0.5 w-10 h-10 rounded-xl border border-accent/30 bg-accent/5 overflow-hidden group transition-all duration-500"
            >
              {user ? (
                <Avatar className="w-full h-full rounded-[inherit]">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    {displayName?.[0] || displayEmail?.[0]}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserCircle
                  size={24}
                  className="text-muted-foreground group-hover:text-accent transition-colors"
                />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="glass-panel border-white/10 mt-2 min-w-[200px]"
            align="end"
          >
            {user ? (
              <>
                <DropdownMenuLabel className="font-headline">
                  {displayName || "Explorer"}
                </DropdownMenuLabel>
                <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
                  {displayEmail}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="hover:bg-accent/10 cursor-pointer"
                  onClick={() => router.push("/profile")}
                >
                  Channel Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="hover:bg-accent/10 cursor-pointer"
                  onClick={() => router.push("/upload")}
                >
                  Creator Studio
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="text-destructive hover:bg-destructive/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut size={16} className="mr-2" /> Log Out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel className="font-headline">
                  Guest Session
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="hover:bg-accent/10 cursor-pointer font-bold text-accent"
                  onClick={() => router.push("/auth")}
                >
                  <Zap size={16} className="mr-2" /> Sign In
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </nav>
  );
}
