
'use server';

import { s3Client, BUCKET_NAME } from '@/lib/s3-client';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';

/**
 * Generic B2 JSON fetcher
 */
async function fetchJsonFromB2<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    const data = await response.Body?.transformToString();
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Generic B2 JSON saver
 */
async function saveJsonToB2(key: string, data: any) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

/* --- VIDEOS --- */

export async function getB2Videos() {
  const dynamicVideos = await fetchJsonFromB2<any[]>('content/registry.json', []);
  // Merge with mock videos for a full feed
  return [...dynamicVideos, ...MOCK_VIDEOS];
}

export async function registerB2Video(videoData: any) {
  const current = await fetchJsonFromB2<any[]>('content/registry.json', []);
  current.unshift(videoData); // Add new video to the top
  await saveJsonToB2('content/registry.json', current);
}

/* --- COMMENTS --- */

export async function getB2Comments(videoId: string) {
  return await fetchJsonFromB2<any[]>(`social/comments/${videoId}.json`, []);
}

export async function postB2Comment(videoId: string, comment: any) {
  const current = await getB2Comments(videoId);
  current.unshift({ ...comment, id: Date.now().toString() });
  await saveJsonToB2(`social/comments/${videoId}.json`, current);
}

/* --- USER DATA (LIKES / HISTORY) --- */

export async function toggleB2Like(userId: string, videoId: string) {
  const key = `users/${userId}/likes.json`;
  const likes = await fetchJsonFromB2<string[]>(key, []);
  
  const index = likes.indexOf(videoId);
  let isLikedNow = false;
  if (index > -1) {
    likes.splice(index, 1);
  } else {
    likes.push(videoId);
    isLikedNow = true;
  }
  
  await saveJsonToB2(key, likes);
  return isLikedNow;
}

export async function getB2LikedVideos(userId: string) {
  return await fetchJsonFromB2<string[]>(`users/${userId}/likes.json`, []);
}

export async function addToB2History(userId: string, videoId: string) {
  const key = `users/${userId}/history.json`;
  const history = await fetchJsonFromB2<string[]>(key, []);
  
  // Remove if exists to move to top
  const filtered = history.filter(id => id !== videoId);
  filtered.unshift(videoId);
  
  // Limit to 100
  await saveJsonToB2(key, filtered.slice(0, 100));
}

export async function getB2History(userId: string) {
  return await fetchJsonFromB2<string[]>(`users/${userId}/history.json`, []);
}
