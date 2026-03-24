
/**
 * Calculates the 'Hotness Score' based on the decay-weighted ranking algorithm.
 * Formula: Score = (Likes - Dislikes) / (Time Since Upload + 2)^1.5
 * @param likes Total number of likes
 * @param dislikes Total number of dislikes
 * @param uploadedAt Date when the video was uploaded
 * @returns A numerical score representing the current trending weight
 */
export function calculateHotScore(likes: number, dislikes: number, uploadedAt: Date | { seconds: number } | string): number {
  const uploadTime = typeof uploadedAt === 'string' 
    ? new Date(uploadedAt).getTime() 
    : ('seconds' in uploadedAt ? uploadedAt.seconds * 1000 : uploadedAt.getTime());
  
  const now = Date.now();
  const hoursSinceUpload = (now - uploadTime) / (1000 * 60 * 60);
  
  // Ensure hours is non-negative
  const t = Math.max(0, hoursSinceUpload);
  
  // Calculate score
  const score = (likes - dislikes) / Math.pow(t + 2, 1.5);
  
  return score;
}
