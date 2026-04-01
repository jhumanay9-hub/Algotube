
'use server';

/**
 * DEPRECATED: ALL MEDIA LOGIC TRANSITIONED TO FIREBASE STORAGE.
 */
export async function getPresignedUploadUrl() { throw new Error('B2 logic is deprecated. Use Firebase Storage.'); }
export async function getPresignedDownloadUrl() { return null; }
