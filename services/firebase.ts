/**
 * EduSafa Learning - Firebase Configuration
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | null = null;
let dbInstance: Database | null = null;
let storageInstance: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

try {
  app = initializeApp(firebaseConfig);
  dbInstance = getDatabase(app);
  storageInstance = getStorage(app);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Ensure exports are never null for TypeScript compatibility
export const getDb = () => {
  if (!dbInstance) throw new Error("Firebase Database not initialized");
  return dbInstance;
};

export const getStorageInstance = () => {
  if (!storageInstance) throw new Error("Firebase Storage not initialized");
  return storageInstance;
};

// Legacy exports (use carefully)
export { app, analytics };
export const db = dbInstance as Database;
export const storage = storageInstance as FirebaseStorage;

export const isFirebaseReady = (): boolean => app !== null && dbInstance !== null;
