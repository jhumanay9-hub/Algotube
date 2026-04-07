'use client';

/**
 * Generates an array of all possible prefixes for a given string.
 * e.g., "React" -> ["r", "re", "rea", "reac", "react"]
 */
export function generatePrefixes(text: string): string[] {
  const prefixes = new Set<string>();
  const words = text.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    for (let i = 1; i <= word.length; i++) {
      prefixes.add(word.substring(0, i));
    }
  }
  
  return Array.from(prefixes);
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for "Did you mean...?" fuzzy matching.
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}
