
'use client';

/**
 * DEPRECATED: ALL SOCIAL LOGIC TRANSITIONED TO BACKBLAZE B2 MESH.
 * 
 * Please use @/app/actions/b2-social.ts and @/app/actions/b2-store.ts 
 * to ensure stability and bypass Firestore permission/proxy errors.
 */

export async function toggleSubscription() {
  console.warn('social-logic.ts is deprecated. Use B2 Social Actions.');
}

export async function addToHistory() {
  console.warn('social-logic.ts is deprecated. Use B2 Store Actions.');
}
