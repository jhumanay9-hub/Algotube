
'use client';

import { 
  Firestore, 
  doc, 
  runTransaction, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Toggles a subscription between a user and a creator using a transaction.
 * Handles lazy hydration of creator profiles.
 */
export async function toggleSubscription(db: Firestore, userId: string, creatorId: string, isSubscribed: boolean) {
  const subRef = doc(db, 'userProfiles', userId, 'subscriptions', creatorId);
  const creatorRef = doc(db, 'userProfiles', creatorId);

  try {
    await runTransaction(db, async (transaction) => {
      const creatorDoc = await transaction.get(creatorRef);
      
      if (isSubscribed) {
        // Unsubscribe
        transaction.delete(subRef);
        if (creatorDoc.exists()) {
          transaction.update(creatorRef, { subscriberCount: increment(-1) });
        }
      } else {
        // Subscribe
        transaction.set(subRef, {
          creatorId,
          subscribedAt: serverTimestamp()
        });

        if (creatorDoc.exists()) {
          transaction.update(creatorRef, { subscriberCount: increment(1) });
        } else {
          // Lazy Hydration: Create profile metadata for mock creator
          transaction.set(creatorRef, {
            id: creatorId,
            username: `creator_${creatorId.slice(0, 5)}`,
            email: `${creatorId}@example.com`,
            joinedAt: serverTimestamp(),
            subscriberCount: 1,
            role: 'creator',
            interests: ['tech', 'vlogs']
          });
        }
      }
    });
  } catch (e: any) {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: subRef.path,
      operation: isSubscribed ? 'delete' : 'create',
      requestResourceData: { creatorId }
    }));
  }
}

/**
 * Adds a video to the user's history with LRU (Last Recently Used) logic.
 * Limits history to 100 items.
 */
export async function addToHistory(db: Firestore, userId: string, videoId: string) {
  const historyRef = doc(db, 'userProfiles', userId, 'history', videoId);
  
  // Upsert history entry
  setDoc(historyRef, {
    videoId,
    watchedAt: serverTimestamp()
  }, { merge: true }).catch(e => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: historyRef.path,
      operation: 'write',
      requestResourceData: { videoId }
    }));
  });

  // LRU Pruning logic (100 items limit)
  const historyCol = collection(db, 'userProfiles', userId, 'history');
  const q = query(historyCol, orderBy('watchedAt', 'desc'));
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.size > 100) {
      const toDelete = snapshot.docs.slice(100);
      for (const d of toDelete) {
        deleteDoc(d.ref);
      }
    }
  } catch (e) {
    // Silent fail for pruning
  }
}
