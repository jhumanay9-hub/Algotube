"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import VideoCard from "@/components/video-card/VideoCard";
import {
  TrendingUp,
  Sparkles,
  Heart,
  DatabaseZap,
  Loader2,
} from "lucide-react";
import { getApiUrl, getMediaUrl } from "@/lib/config";

/**
 * AlgoTube Home - Video Discovery Interface
 * Fetches videos from the local XAMPP PHP backend.
 */
export default function Home() {
  const [videos, setVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch(getApiUrl("get_feed.php"));
        const data = await res.json();

        // Map PHP schema to expected VideoCard schema using centralized normalization
        const mappedData = Array.isArray(data)
          ? data.map((v) => ({
              ...v,
              url: getMediaUrl(v.file_path),
              author_name: v.author_name || "Local Upload",
              description: v.description || `Uploaded on ${v.upload_date}`,
              thumbnail: getMediaUrl(v.thumbnail_path),
            }))
          : [];

        setVideos(mappedData);
      } catch (e) {
        console.error("XAMPP MySQL Sync Error:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-10 glass-panel rounded-3xl p-8 relative overflow-hidden group min-h-[320px] flex items-center mt-4">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
              <Heart size={200} className="text-accent fill-accent/20" />
            </div>
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-2 mb-4 text-accent">
                <Sparkles size={20} />
                <span className="font-code text-xs tracking-widest uppercase">
                  Backend: Operational
                </span>
              </div>
              <h1 className="text-5xl font-headline font-bold mb-4 bg-gradient-to-r from-white via-white to-accent bg-clip-text text-transparent leading-tight">
                Native XAMPP <br />
                Video Delivery
              </h1>
              <p className="text-muted-foreground font-body leading-relaxed mb-8 text-lg">
                Powered by PHP & MySQL. Delivering local media bypassing Next.js
                payload limits and CORS restrictions.
              </p>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[9px] text-accent font-code w-fit">
                <DatabaseZap size={10} /> MYSQL DATABASE ACTIVE
              </div>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">
                Latest Uploads
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
              <Loader2 className="animate-spin text-accent" size={40} />
              <p className="font-code text-xs tracking-widest uppercase">
                Querying Local Server...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {videos.length > 0 ? (
                videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center opacity-30">
                  <p className="font-code text-xs uppercase tracking-widest">
                    No transmissions detected in MySQL registry
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
