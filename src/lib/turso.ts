import { createClient } from '@libsql/client';

/**
 * Turso Database Client Singleton
 * Manages SQL mesh connection using prepared statements for security.
 * Pulls configuration from environment variables.
 */
export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

export type VideoRow = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  uploaderId: string;
  uploadDate: string;
  viewsCount: number;
  likesCount: number;
  category: string;
  tags: string; 
  aspectRatio: string;
  s3Key: string;
  s3Bucket: string;
};
