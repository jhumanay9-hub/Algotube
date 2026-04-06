"use client";

import React, { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/config";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import VideoCard from "@/components/video-card/VideoCard";
import { useUser } from "@/context/AuthContext";
import { ThumbsUp, Heart, Loader2, DatabaseZap } from "lucide-react";

export default function LikedVideosPage() {
  const { user, isLoading: isUserLoading } = useUser();
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        console.log(
          "[Liked Page] Fetching liked video IDs for user:",
          user.uid,
        );

        // Fetch liked IDs from SQL interaction mesh
        const lRes = await fetch(getApiUrl("likes.php", { userId: user.uid }));

        // JSON Guard: Check response status
        if (!lRes.ok) {
          throw new Error(`Likes fetch failed! HTTP status: ${lRes.status}`);
        }

        // JSON Guard: Validate content type
        const contentType = lRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Oops, we didn't get JSON from the PHP server!");
        }

        const likedIdsArray = await lRes.json();
        console.log("[Liked Page] Raw liked IDs:", likedIdsArray);
        const likedIds = new Set(likedIdsArray); // O(1) lookup instead of O(n) .includes()

        console.log("[Liked Page] Fetching all videos...");

        // Endpoint Correction: Use get_videos.php instead of videos
        const vRes = await fetch(getApiUrl("get_videos.php", { limit: 100 }));

        // JSON Guard: Check response status
        if (!vRes.ok) {
          throw new Error(`Videos fetch failed! HTTP status: ${vRes.status}`);
        }

        // JSON Guard: Validate content type
        const videoContentType = vRes.headers.get("content-type");
        if (
          !videoContentType ||
          !videoContentType.includes("application/json")
        ) {
          throw new TypeError(
            "Oops, we didn't get JSON from the PHP server for videos!",
          );
        }

        const allVideos = await vRes.json();
        console.log("[Liked Page] Raw Data from PHP (Videos):", allVideos);
        console.log("[Liked Page] Is Array:", Array.isArray(allVideos));

        // O(n) single pass filter with O(1) Set lookup
        const filtered = Array.isArray(allVideos)
          ? allVideos.filter((v: any) => likedIds.has(Number(v.id)))
          : [];

        console.log("[Liked Page] Filtered liked videos:", filtered);
        setLikedVideos(filtered);
      } catch (e: any) {
        console.error("[Liked Page] Mesh Sync Failure - Full Error:", e);
        console.error("[Liked Page] Error Details:", {
          message: e.message,
          isTypeError: e instanceof TypeError,
          isHttpError: e.message?.includes("HTTP"),
          isContentTypeError: e.message?.includes("JSON"),
        });
        // Empty State Handling: Prevent UI crash
        setLikedVideos([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          <div className="mb-6 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Heart className="text-accent fill-accent" size={24} />
              <h2 className="text-xl font-headline font-bold">
                Liked Transmissions
              </h2>
            </div>
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
                <DatabaseZap size={12} /> TURSO SQL REGISTRY
              </div>
            )}
          </div>

          {!user && !isUserLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center">
              <ThumbsUp size={48} className="mb-4 opacity-20" />
              <p className="max-w-xs">
                Sign in to see your liked transmissions stored on the SQL mesh.
              </p>
            </div>
          ) : isLoading || isUserLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-video rounded-2xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {likedVideos.length > 0 ? (
                likedVideos.map((video, idx) => (
                  <VideoCard key={`${video.id}-${idx}`} video={video} />
                ))
              ) : (
                <div className="col-span-full py-12 text-center opacity-30">
                  <p className="font-code text-xs uppercase">
                    Your liked transmission manifest is empty
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
