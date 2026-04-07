
'use client';

import { useState, useEffect } from 'react';
import { getPresignedDownloadUrl } from '@/app/actions/s3-actions';

/**
 * Hook to resolve an S3 Key into a playable presigned URL.
 * Handles loading states and caching for the component lifecycle.
 */
export function useS3Url(s3Key: string | undefined, fallbackUrl?: string) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function resolveUrl() {
      if (!s3Key) {
        setUrl(fallbackUrl || null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const signedUrl = await getPresignedDownloadUrl(s3Key);
        if (isMounted) {
          setUrl(signedUrl || fallbackUrl || null);
        }
      } catch (err) {
        if (isMounted) {
          setUrl(fallbackUrl || null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [s3Key, fallbackUrl]);

  return { url, isLoading };
}
