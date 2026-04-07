
/**
 * Calculates the 'Hotness Score' based on the decay-weighted ranking algorithm.
 * Formula: Score = (Views + (Likes * 5)) / (AgeInHours + 2)^1.5
 * 
 * @param views Total number of views
 * @param likes Total number of likes
 * @param uploadedAt Date when the video was uploaded (Date object, timestamp number, ISO string, or Firestore-style {seconds})
 * @returns A numerical score representing the current trending weight
 */
export function calculateHotScore(views: number, likes: number, uploadedAt: Date | { seconds: number } | string | number): number {
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
    uploadTime = Date.now();
  }
  
  const now = Date.now();
  // Difference in hours
  const hoursSinceUpload = (now - uploadTime) / (1000 * 60 * 60);
  
  // Ensure hours is non-negative
  const t = Math.max(0, hoursSinceUpload);
  
  // Formula: (Views + Likes*5) / (Age + 2)^1.5
  // Weighting likes 5x more than views as requested.
  const score = (views + (likes * 5)) / Math.pow(t + 2, 1.5);
  
  return score;
}
