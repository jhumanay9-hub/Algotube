import { createClient } from '@libsql/client';

/**
 * Turso Database Client Singleton
 * Manages SQL mesh connection using prepared statements for security.
 */
export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

/**
 * VideoRow - Matches the specific SQL schema requested.
 * id is an auto-incrementing INTEGER.
 */
export type VideoRow = {
  id: number;
  title: string;
  description: string | null;
  url: string;
  author_name: string | null;
};
