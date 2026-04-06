"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import VideoCard from "@/components/video-card/VideoCard";
import { useSearch } from "@/hooks/use-search";
import { Search, Loader2, Sparkles, DatabaseZap } from "lucide-react";
import { getApiUrl, getMediaUrl } from "@/lib/config";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const { results, isSearching } = useSearch(query, allVideos);

  useEffect(() => {
    async function load() {
      setIsInitialLoad(true);
      try {
        const res = await fetch(getApiUrl("get_feed.php?limit=100"));
        const data = await res.json();
        setAllVideos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("SQL Search Load Failure");
      } finally {
        setIsInitialLoad(false);
      }
    }
    load();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
      <div className="mb-8 flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <Search className="text-accent" size={24} />
          <h2 className="text-xl font-headline font-bold">
            Results for <span className="text-accent">"{query}"</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-code">
          <DatabaseZap size={12} /> SQL REGISTRY SEARCH ACTIVE
        </div>
      </div>

      {isInitialLoad || (isSearching && results.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
          <Loader2 className="animate-spin text-accent" size={40} />
          <p className="font-code text-xs tracking-widest uppercase">
            Querying SQL Mesh...
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {results.map((res, idx) => (
            <div
              key={res.video.id}
              className="relative animate-in fade-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {res.isFuzzy && (
                <div className="absolute -top-2 -left-2 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/20 backdrop-blur-md border border-accent/40 text-[9px] text-accent font-code font-bold uppercase tracking-wider">
                  <Sparkles size={10} /> Fuzzy Match
                </div>
              )}
              <VideoCard video={res.video} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 text-muted-foreground opacity-30 text-center">
          <Search size={64} className="mb-6" />
          <h3 className="text-xl font-headline font-bold text-white mb-2 uppercase tracking-widest">
            No Transmissions Found
          </h3>
          <p className="max-w-xs font-body text-sm">
            Our sensors couldn't locate any data packets matching your query on
            the SQL mesh.
          </p>
        </div>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-accent" size={40} />
            </div>
          }
        >
          <SearchContent />
        </Suspense>
      </div>
    </div>
  );
}
