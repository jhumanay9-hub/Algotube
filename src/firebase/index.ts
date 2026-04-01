'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * ALGOTUBE FIREBASE INITIALIZATION - AUTH ONLY
 * Firebase is strictly limited to Identity Management.
 * Data persistence and media are handled by Turso SQL.
 */
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    // Firestore and Storage removed as requested
  };
}

export * from './provider';
export * from './client-provider';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
