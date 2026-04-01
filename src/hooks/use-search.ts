'use client';

import { useState, useEffect } from 'react';
import { getLevenshteinDistance, generatePrefixes } from '@/lib/search-utils';

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
      
      // 1. Prefix Matching
      // We check searchKeywords or generate them on the fly for mock/legacy data
      const exactMatches = allVideos.filter(v => {
        const keywords = v.searchKeywords || generatePrefixes(v.title || "");
        return keywords.some((k: string) => k.startsWith(searchTerm) || searchTerm.startsWith(k));
      });

      let finalResults: SearchResult[] = exactMatches.map(v => ({
        video: v,
        score: (v.views || v.viewsCount || 0) + 1000, // Significant boost for exact matches
        isFuzzy: false
      }));

      // 2. Fuzzy Matching (suggesting results for minor typos)
      if (finalResults.length < 5) {
        const fuzzyResults = allVideos
          .filter(v => !exactMatches.find(em => em.id === v.id))
          .map(v => {
            const distance = getLevenshteinDistance(searchTerm, (v.title || "").toLowerCase());
            return { video: v, distance };
          })
          .filter(item => item.distance <= 2)
          .map(item => ({
            video: item.video,
            score: (item.video.views || item.video.viewsCount || 0) * (1 / (item.distance + 1)),
            isFuzzy: true
          }));
        
        finalResults = [...finalResults, ...fuzzyResults];
      }

      // 3. Rank by score (Engagement + Relevance)
      finalResults.sort((a, b) => b.score - a.score);
      
      setResults(finalResults.slice(0, 24));
      setIsSearching(false);
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, allVideos, debounceMs]);

  return { results, isSearching };
}
