"use client";

import { useState, useEffect } from "react";
import { getLevenshteinDistance, generatePrefixes } from "@/lib/search-utils";

export interface SearchResult {
  video: any;
  score: number;
  isFuzzy: boolean;
}

/**
 * useSearch Hook
 * Implements debounced prefix matching and fuzzy Levenshtein ranking.
 * Now handles dynamic indexing for data lacking searchKeywords.
 */
export function useSearch(query: string, allVideos: any[], debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      const searchTerm = query.toLowerCase().trim();

      // 1. Prefix Matching - O(n) single pass
      // We check searchKeywords or generate them on the fly for mock/legacy data
      const exactMatchIds = new Set<string>();
      const exactMatches: SearchResult[] = [];

      for (const v of allVideos) {
        const keywords = v.searchKeywords || generatePrefixes(v.title || "");
        const isMatch = keywords.some(
          (k: string) => k.startsWith(searchTerm) || searchTerm.startsWith(k),
        );
        if (isMatch) {
          exactMatchIds.add(v.id);
          exactMatches.push({
            video: v,
            score: (v.views || v.viewsCount || 0) + 1000,
            isFuzzy: false,
          });
        }
      }

      let finalResults: SearchResult[] = exactMatches;

      // 2. Fuzzy Matching (suggesting results for minor typos) - O(n) single pass
      if (finalResults.length < 5) {
        const fuzzyResults: SearchResult[] = [];

        for (const v of allVideos) {
          if (exactMatchIds.has(v.id)) continue; // O(1) lookup instead of .find()

          const distance = getLevenshteinDistance(
            searchTerm,
            (v.title || "").toLowerCase(),
          );
          if (distance <= 2) {
            fuzzyResults.push({
              video: v,
              score: (v.views || v.viewsCount || 0) * (1 / (distance + 1)),
              isFuzzy: true,
            });
          }
        }

        finalResults = [...finalResults, ...fuzzyResults];
      }

      // 3. Rank by score (Engagement + Relevance) - O(n log n) unavoidable for sorting
      finalResults.sort((a, b) => b.score - a.score);

      setResults(finalResults.slice(0, 24));
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, allVideos, debounceMs]);

  return { results, isSearching };
}
