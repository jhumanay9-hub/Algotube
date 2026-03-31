
'use server';

import { s3Client, BUCKET_NAME } from '@/lib/s3-client';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { MOCK_VIDEOS } from '@/app/lib/mock-data';

/**
 * Generic B2 JSON fetcher with error diagnostics
 */
async function fetchJsonFromB2<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    const data = await response.Body?.transformToString();
    return data ? JSON.parse(data) : defaultValue;
  } catch (error: any) {
    if (error.name !== 'NoSuchKey') {
      console.error(`B2 Mesh Error [FETCH]: ${key}`, error.message);
    }
    return defaultValue;
  }
}

/**
 * Generic B2 JSON saver with error diagnostics
 */
async function saveJsonToB2(key: string, data: any) {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    }));
  } catch (error: any) {
    console.error(`B2 Mesh Error [SAVE]: ${key}`, error.message);
    throw new Error(`B2 Node failed to persist data: ${error.message}`);
  }
}

/* --- USER PROFILES --- */

export async function getB2UserProfile(userId: string) {
  return await fetchJsonFromB2<any>(`users/${userId}/profile.json`, null);
}

export async function saveB2UserProfile(userId: string, profile: any) {
  await saveJsonToB2(`users/${userId}/profile.json`, profile);
}

/* --- VIDEOS --- */

export async function getB2Videos() {
  const dynamicVideos = await fetchJsonFromB2<any[]>('content/registry.json', []);
  // Combine with mock data for a robust discovery feed
  return [...dynamicVideos, ...MOCK_VIDEOS];
}

export async function registerB2Video(videoData: any) {
  const current = await fetchJsonFromB2<any[]>('content/registry.json', []);
  current.unshift(videoData);
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

/* --- SOCIAL INTERACTIONS --- */

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
  
  const filtered = history.filter(id => id !== videoId);
  filtered.unshift(videoId);
  
  // Keep last 100 transmissions in history
  await saveJsonToB2(key, filtered.slice(0, 100));
}

export async function getB2History(userId: string) {
  return await fetchJsonFromB2<string[]>(`users/${userId}/history.json`, []);
}
