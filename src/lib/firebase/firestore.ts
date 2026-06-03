// ============================================================
// Firestore Helper Functions
// ============================================================
// Thin typed wrappers around Firestore SDK for common operations.
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type QueryConstraint,
  type DocumentReference,
  type CollectionReference,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseDb } from './config';

// Re-export for convenience
export { serverTimestamp };

/**
 * Get a typed document reference.
 */
export function getDocRef<T extends DocumentData>(
  collectionName: string,
  docId: string,
): DocumentReference<T> {
  return doc(getFirebaseDb(), collectionName, docId) as DocumentReference<T>;
}

/**
 * Get a typed collection reference.
 */
export function getCollectionRef<T extends DocumentData>(
  collectionName: string,
): CollectionReference<T> {
  return collection(getFirebaseDb(), collectionName) as CollectionReference<T>;
}

/**
 * Get a subcollection reference.
 */
export function getSubcollectionRef<T extends DocumentData>(
  parentCollection: string,
  parentId: string,
  subcollection: string,
): CollectionReference<T> {
  return collection(getFirebaseDb(), parentCollection, parentId, subcollection) as CollectionReference<T>;
}

/**
 * Read a single document by ID.
 */
export async function readDoc<T extends DocumentData>(
  collectionName: string,
  docId: string,
): Promise<(T & { id: string }) | null> {
  const ref = getDocRef<T>(collectionName, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/**
 * Query a collection with constraints.
 */
export async function queryCollection<T extends DocumentData>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const ref = getCollectionRef<T>(collectionName);
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string });
}

/**
 * Subscribe to realtime updates on a query.
 */
export function subscribeToQuery<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[],
  callback: (docs: (T & { id: string })[]) => void,
): Unsubscribe {
  const ref = getCollectionRef<T>(collectionName);
  const q = query(ref, ...constraints);
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string });
    callback(results);
  });
}

// Re-export query builders for convenience
export { where, orderBy, limit, setDoc, updateDoc, deleteDoc, doc, collection, query, getDocs, onSnapshot, getFirebaseDb };
