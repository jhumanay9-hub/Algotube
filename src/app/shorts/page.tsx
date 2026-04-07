"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import ShortsPlayer from "@/components/video/ShortsPlayer";
import { Zap, Loader2, Plus, RefreshCw, DatabaseZap } from "lucide-react";
import { UploadModal } from "@/components/video/UploadModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getApiUrl, getMediaUrl } from "@/lib/config";

export default function ShortsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Replaced Firebase Auth with local Guest placeholder so Turbopack can build
  const user = { name: "Guest", id: 1 };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl("get_feed.php"));
      const data = await res.json();

      // Hydrate shorts UI structurally with Local MySQL PHP schema variables
      const mappedData = Array.isArray(data)
        ? data.map((v) => ({
            ...v,
            url: v.file_path,
            creator: v.author_name || "Local Upload",
            thumbnail: getMediaUrl(v.thumbnail_path),
          }))
        : [];
      setVideos(mappedData);
    } catch (e) {
      console.error("XAMPP MySQL Sync failed for Shorts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-black">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth relative">
          <div className="fixed right-8 top-24 z-40 flex flex-col gap-4">
            {user && (
              <Button
                onClick={() => setIsUploadOpen(true)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center group p-0 border-0"
              >
                <Plus
                  size={28}
                  className="text-white group-hover:rotate-90 transition-transform duration-300"
                />
              </Button>
            )}
            <Button
              onClick={loadData}
              variant="ghost"
              className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white p-0"
            >
              <RefreshCw
                size={24}
                className={cn(isLoading && "animate-spin")}
              />
            </Button>
          </div>

          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 gap-4">
              <Loader2 className="animate-spin" size={48} />
              <p className="font-code text-sm tracking-widest animate-pulse uppercase">
                Syncing SQL Mesh...
              </p>
            </div>
          ) : videos && videos.length > 0 ? (
            videos.map((short) => <ShortsPlayer key={short.id} video={short} />)
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-black/40">
              <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                <Zap size={48} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-headline font-bold text-white mb-2">
                Shorts Matrix Empty
              </h2>
              <p className="max-w-md font-body text-sm mb-8">
                No vertical transmissions detected in the SQL registry. Be the
                first to broadcast!
              </p>
              {user && (
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="bg-red-600 hover:bg-red-500 font-headline font-bold px-8 py-6 rounded-2xl"
                >
                  START SHORT BROADCAST
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          loadData();
        }}
        forcedCategory="Shorts"
      />

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
