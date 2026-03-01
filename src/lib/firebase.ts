import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, get, set, runTransaction, Database } from "firebase/database";

// Use import.meta.env to access the variables securely
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

// Check if Firebase is properly configured
const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.databaseURL && !!firebaseConfig.projectId;

// Initialize Firebase only if properly configured
let app: FirebaseApp | undefined;
let db: Database | undefined;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.warn("Firebase is not configured. Visit count features will be disabled.");
}

// Export db (may be undefined if not configured)
export { db, ref, get, set, runTransaction, isFirebaseConfigured };
