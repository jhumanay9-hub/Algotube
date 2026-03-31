
'use server';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '@/lib/s3-client';

/**
 * Generates a presigned URL for a client to upload a file directly to B2.
 * Note: The client must include the exact Content-Type header used here.
 */
export async function getPresignedUploadUrl(fileName: string, contentType: string) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      ContentType: contentType,
    });

    // 1-hour expiry for the upload window
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { url, key: fileName, bucket: BUCKET_NAME };
  } catch (error: any) {
    console.error('B2 Presign Error (Upload):', error);
    throw new Error('Could not generate upload authorization from B2 Mesh.');
  }
}

/**
 * Generates a presigned URL for a client to stream/view a file from B2.
 * Valid for 60 minutes as per requirements.
 */
export async function getPresignedDownloadUrl(key: string) {
  if (!key) return null;
  
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return url;
  } catch (error: any) {
    console.error('B2 Presign Error (Download):', error);
    return null;
  }
}
