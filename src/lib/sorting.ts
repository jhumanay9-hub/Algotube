export interface VideoMetadata {
  id: string;
  title: string;
  views: number;
  uploadedAt: number;
  tags: string[];
  thumbnail: string;
  creator: string;
}

/**
 * Calculates trending weight: views weighted by time decay
 * Formula: weight = views / (hours_since_upload + 2)^1.5
 * Uses a stable reference time (Feb 25, 2025) to prevent hydration mismatches.
 */
function calculateTrendingWeight(video: VideoMetadata): number {
  const referenceTime = 1740480000000; // Stable reference: 2025-02-25
  const hoursSinceUpload =
    (referenceTime - video.uploadedAt) / (1000 * 60 * 60);
  const normalizedHours = Math.max(0, hoursSinceUpload);
  return video.views / Math.pow(normalizedHours + 2, 1.5);
}

/**
 * Heapsort implementation to sort videos by trending weight in descending order.
 * Optimized: Pre-calculates weights once to avoid O(n log n × c) redundant calculations.
 * Now runs in O(n log n) with O(n) space for weight cache.
 */
export function heapSortTrending(videos: VideoMetadata[]): VideoMetadata[] {
  const n = videos.length;
  if (n <= 1) return [...videos];

  // Pre-calculate all weights once - O(n)
  const weightCache = new Map<string, number>();
  for (const video of videos) {
    weightCache.set(video.id, calculateTrendingWeight(video));
  }

  const arr = [...videos];

  // Min-heap heapify function using cached weights - O(1) lookup
  const heapify = (size: number, i: number) => {
    let smallest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    const weightLeft = weightCache.get(arr[left]?.id) ?? 0;
    const weightRight = weightCache.get(arr[right]?.id) ?? 0;
    const weightSmallest = weightCache.get(arr[smallest]?.id) ?? 0;

    if (left < size && weightLeft < weightSmallest) {
      smallest = left;
    }

    if (
      right < size &&
      weightRight < (weightCache.get(arr[smallest]?.id) ?? 0)
    ) {
      smallest = right;
    }

    if (smallest !== i) {
      [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
      heapify(size, smallest);
    }
  };

  // Build min heap - O(n)
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  // Extract elements from heap one by one - O(n log n)
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(i, 0);
  }

  return arr;
}
