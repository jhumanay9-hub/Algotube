
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
  const hoursSinceUpload = (referenceTime - video.uploadedAt) / (1000 * 60 * 60);
  const normalizedHours = Math.max(0, hoursSinceUpload);
  return video.views / Math.pow(normalizedHours + 2, 1.5);
}

/**
 * Heapsort implementation to sort videos by trending weight in descending order.
 */
export function heapSortTrending(videos: VideoMetadata[]): VideoMetadata[] {
  const arr = [...videos];
  const n = arr.length;
  if (n <= 1) return arr;

  // Min-heap heapify function. 
  // Sorting with a min-heap and swapping root to the end results in descending order.
  const heapify = (size: number, i: number) => {
    let smallest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    if (left < size && calculateTrendingWeight(arr[left]) < calculateTrendingWeight(arr[smallest])) {
      smallest = left;
    }

    if (right < size && calculateTrendingWeight(arr[right]) < calculateTrendingWeight(arr[smallest])) {
      smallest = right;
    }

    if (smallest !== i) {
      [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
      heapify(size, smallest);
    }
  };

  // Build min heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    // Move current root (smallest weight in the current heap) to the end
    [arr[0], arr[i]] = [arr[i], arr[0]];

    // Call min heapify on the reduced heap
    heapify(i, 0);
  }

  // The array is now sorted descending (highest weight at start)
  return arr;
}
