'use client';

import { useState, useEffect, useMemo } from 'react';
import { getLevenshteinDistance } from '@/lib/search-utils';

export interface SearchResult {
  video: any;
  score: number;
  isFuzzy: boolean;
}

/**
 * useSearch Hook
 * Implements debounced prefix matching and fuzzy Levenshtein ranking.
 */
export function useSearch(query: string, allVideos: any[], debounceMs = 300) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      const searchTerm = query.toLowerCase().trim();
      
      // 1. Prefix Matching (mimics Firestore array-contains on searchKeywords)
      const exactMatches = allVideos.filter(v => {
        const keywords = v.searchKeywords || [];
        return keywords.includes(searchTerm);
      });

      let finalResults: SearchResult[] = exactMatches.map(v => ({
        video: v,
        score: v.views || v.viewsCount || 0,
        isFuzzy: false
      }));

      // 2. Fuzzy Matching (if prefix yields low results)
      if (finalResults.length < 5) {
        const fuzzyResults = allVideos
          .filter(v => !exactMatches.find(em => em.id === v.id))
          .map(v => {
            const distance = getLevenshteinDistance(searchTerm, v.title.toLowerCase());
            return { video: v, distance };
          })
          .filter(item => item.distance <= 2) // Limit distance to 2
          .map(item => ({
            video: item.video,
            score: (item.video.views || 0) * (1 / (item.distance + 1)),
            isFuzzy: true
          }));
        
        finalResults = [...finalResults, ...fuzzyResults];
      }

      // 3. Rank by view count and relevance
      finalResults.sort((a, b) => b.score - a.score);
      
      setResults(finalResults.slice(0, 20)); // Limit to 20 for performance
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, allVideos, debounceMs]);

  return { results, isSearching };
}
