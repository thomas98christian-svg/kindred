// ============================================================
// Firebase Client-Side Configuration
// ============================================================
// This module initializes the Firebase app, Auth, and Firestore
// for use in client components. Safe to expose — these config
// values are public (the NEXT_PUBLIC_ prefix is intentional).
//
// Initialization is lazy to avoid crashing during `next build`
// when env vars may not be populated.
// ============================================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _emulatorsConnected = false;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  const existing = getApps();
  if (existing.length > 0) {
    _app = existing[0];
    return _app;
  }
  _app = initializeApp(firebaseConfig);
  return _app;
}

function connectEmulators(auth: Auth, db: Firestore) {
  if (_emulatorsConnected) return;
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    _emulatorsConnected = true;
  } catch {
    // Emulators may not be running — fail silently in dev
  }
}

/**
 * Get the Firebase App instance.
 */
export function getApp(): FirebaseApp {
  return getFirebaseApp();
}

/**
 * Get the Firebase Auth instance.
 */
export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  if (_db) connectEmulators(_auth, _db);
  return _auth;
}

/**
 * Get the Firestore instance.
 */
export function getFirebaseDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  if (_auth) connectEmulators(_auth, _db);
  return _db;
}
