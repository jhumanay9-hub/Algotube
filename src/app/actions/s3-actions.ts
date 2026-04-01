
'use server';

/**
 * DEPRECATED: ALL MEDIA LOGIC TRANSITIONED TO FIREBASE STORAGE.
 * This file is kept as a stub to prevent broken imports.
 */
export async function getPresignedUploadUrl() { 
  throw new Error('S3/B2 logic is deprecated. Use Firebase Storage for media transmissions.'); 
}

export async function getPresignedDownloadUrl() { 
  return null; 
}
