// ============================================================
// Firebase Auth Helper Functions
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';
import { getFirebaseAuth } from './config';

/**
 * Sign up a new user with email and password.
 * After signup, the caller should also hit /api/auth/on-signup
 * to create the Firestore profile and reliability documents.
 */
export async function signUp(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

/**
 * Sign in an existing user with email and password.
 */
export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

/**
 * Get the current user's ID token for server-side verification.
 */
export async function getIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { type Auth, type User };
