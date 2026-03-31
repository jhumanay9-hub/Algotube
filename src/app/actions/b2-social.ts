
'use server';

import { s3Client, BUCKET_NAME } from '@/lib/s3-client';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Fetches a user's subscription list from Backblaze B2.
 */
export async function getB2Subscriptions(userId: string): Promise<string[]> {
  if (!userId) return [];
  const key = `social/subs/${userId}.json`;
  
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    
    const data = await response.Body?.transformToString();
    return data ? JSON.parse(data) : [];
  } catch (error: any) {
    // If file doesn't exist, return empty array
    return [];
  }
}

/**
 * Toggles a subscription in the user's B2 manifest.
 */
export async function toggleB2Subscription(userId: string, creatorId: string, isCurrentlySubscribed: boolean) {
  if (!userId || !creatorId) return;
  const key = `social/subs/${userId}.json`;
  
  try {
    let subs = await getB2Subscriptions(userId);
    
    if (isCurrentlySubscribed) {
      subs = subs.filter(id => id !== creatorId);
    } else {
      if (!subs.includes(creatorId)) {
        subs.push(creatorId);
      }
    }

    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(subs),
      ContentType: 'application/json',
    }));

    return { success: true, isSubscribed: !isCurrentlySubscribed };
  } catch (error: any) {
    console.error('B2 Social Logic Error:', error);
    throw new Error('Could not update subscription on the mesh.');
  }
}
