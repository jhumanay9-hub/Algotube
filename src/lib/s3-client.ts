
import { S3Client } from '@aws-sdk/client-s3';

const endpoint = process.env.BACKBLAZE_ENDPOINT;
const region = process.env.BACKBLAZE_REGION || 'us-east-005';
const accessKeyId = process.env.BACKBLAZE_KEY_ID;
const secretAccessKey = process.env.BACKBLAZE_APPLICATION_KEY;

if (!accessKeyId || !secretAccessKey || !endpoint) {
  console.warn('S3 Client: Missing Backblaze configuration in .env. S3 features will be unavailable.');
}

/**
 * Configure S3 Client for Backblaze B2.
 * ForcePathStyle is essential for B2 compatibility.
 * We ensure the endpoint is correctly formatted as a full URL.
 */
export const s3Client = new S3Client({
  endpoint: endpoint ? (endpoint.startsWith('http') ? endpoint : `https://${endpoint}`) : undefined,
  region,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
  forcePathStyle: true,
});

export const BUCKET_NAME = process.env.BACKBLAZE_BUCKET || 'algotube-media';
