
/**
 * Calculates the 'Hotness Score' based on the decay-weighted ranking algorithm.
 * Formula: Score = (Likes - Dislikes) / (Time Since Upload + 2)^1.5
 * @param likes Total number of likes
 * @param dislikes Total number of dislikes
 * @param uploadedAt Date when the video was uploaded (Date object, timestamp number, ISO string, or Firestore-style {seconds})
 * @returns A numerical score representing the current trending weight
 */
export function calculateHotScore(likes: number, dislikes: number, uploadedAt: Date | { seconds: number } | string | number): number {
  let uploadTime: number;

  if (typeof uploadedAt === 'number') {
    uploadTime = uploadedAt;
  } else if (typeof uploadedAt === 'string') {
    uploadTime = new Date(uploadedAt).getTime();
  } else if (uploadedAt instanceof Date) {
    uploadTime = uploadedAt.getTime();
  } else if (uploadedAt && typeof uploadedAt === 'object' && 'seconds' in uploadedAt) {
    uploadTime = (uploadedAt as { seconds: number }).seconds * 1000;
  } else {
    // Fallback to now if the format is unrecognized
    uploadTime = Date.now();
  }
  
  const now = Date.now();
  const hoursSinceUpload = (now - uploadTime) / (1000 * 60 * 60);
  
  // Ensure hours is non-negative
  const t = Math.max(0, hoursSinceUpload);
  
  // Calculate score: Simple decay weighted engagement
  const score = (likes - dislikes) / Math.pow(t + 2, 1.5);
  
  return score;
}
