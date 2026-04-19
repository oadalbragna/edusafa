/**
 * EduSafa Learning - Firebase Configuration
 *
 * Uses environment variables for configuration.
 * All VITE_FIREBASE_* variables MUST be set in .env file.
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getDatabase, Database } from "firebase/database";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration from environment variables
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

// Validate Firebase configuration before initialization
const missingVars = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value || value.includes('your_') || value.includes('your_project'))
  .map(([key]) => key);

if (missingVars.length > 0) {
  const errorMsg = `Missing Firebase configuration: ${missingVars.join(', ')}. Set all VITE_FIREBASE_* variables in .env file.`;
  console.error(`🔴 EduSafa: ${errorMsg}`);
  // Don't throw error - allow app to load with warning
  console.warn('⚠️ App will load but Firebase features will not work. Please configure Firebase in .env file.');
}

// Initialize Firebase
let app: FirebaseApp | null = null;
let db: Database | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

// Only initialize Firebase if config is valid
const isConfigValid = missingVars.length === 0;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);

    // Initialize Analytics only in browser environment
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }
    
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('🔴 Firebase initialization error:', error);
    // Don't throw - allow app to load
    console.warn('⚠️ Firebase failed to initialize. App will run in offline mode.');
  }
} else {
  console.warn('⚠️ Firebase not configured. Running in development mode without backend.');
}

// Export Firebase instances
// Note: These can be null if Firebase is not configured
export { app, db, storage, analytics };

// Helper to check if Firebase is available
export const isFirebaseReady = (): boolean => {
  return app !== null && db !== null && storage !== null;
};

export default app;
