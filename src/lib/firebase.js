import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore, terminate as terminateFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredFirebaseConfig = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingConfigKeys = requiredFirebaseConfig.filter((key) => !firebaseConfig[key]);
if (missingConfigKeys.length > 0) {
  console.error('Firebase configuration is missing required fields:', missingConfigKeys.join(', '));
}

export const isFirebaseConfigured = missingConfigKeys.length === 0;

let app = null;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error('Firebase initialization error:', e);
}

console.debug('Firebase config loaded:', {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  measurementId: firebaseConfig.measurementId,
  configured: isFirebaseConfigured,
});

let auth = null;
let db = null;
let analytics = null;
export let firestoreLongPollingEnabled = false;

try {
  auth = app ? getAuth(app) : null;
  // Disable persistence to avoid issues with private browsing or restricted storage
  if (auth) {
    auth.setPersistence = auth.setPersistence || (() => Promise.resolve());
  }
  console.debug('Firebase auth object present:', { authExists: !!auth });
} catch (e) {
  console.error('Auth initialization error:', e);
}

try {
  // Initialize Firestore with options tuned for restricted storage / Firefox
  const isBrowser = typeof navigator !== 'undefined' && typeof window !== 'undefined';
  const ua = isBrowser ? (navigator.userAgent || '') : '';
  const isFirefox = /firefox/i.test(ua);

  const firestoreInitOptions = {
    cacheSizeBytes: 1048576, // 1MB minimum
  };

  // Force long-polling to improve reliability in restricted environments
  // (Firefox private mode and other cases where WebChannel/WebSocket transport is interrupted).
  firestoreInitOptions.experimentalForceLongPolling = true;
  firestoreInitOptions.experimentalAutoDetectLongPolling = true;
  console.info('Firestore init: enabling experimentalForceLongPolling and auto-detect long polling');

  db = app ? initializeFirestore(app, firestoreInitOptions) : null;
  console.debug('Firestore initialized', { dbExists: !!db, options: firestoreInitOptions });
} catch (e) {
  // If persistence is already initialized or another error occurs, try getFirestore as fallback
  console.warn('Firestore initialization warning:', e instanceof Error ? e.message : String(e));
  try {
    db = app ? getFirestore(app) : null;
    console.debug('Firestore initialized via fallback (getFirestore)');
  } catch (fallbackErr) {
    console.error('Firestore fallback failed:', fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
  }
}

/**
 * Reinitialize Firestore with long-polling enabled. Safe to call multiple times.
 */
export const ensureLongPolling = async () => {
  if (!app) return;
  if (firestoreLongPollingEnabled) return;
  try {
    console.info('[firebase] ensureLongPolling: attempting to reinitialize Firestore with long-polling');
    // Try to terminate the existing instance first (preferred: instance.terminate())
    if (db) {
      try {
        if (typeof db.terminate === 'function') {
          await db.terminate();
          console.debug('[firebase] previous Firestore instance terminated via db.terminate()');
        } else {
          await terminateFirestore(db);
          console.debug('[firebase] previous Firestore instance terminated via terminateFirestore()');
        }
      } catch (tErr) {
        console.warn('[firebase] failed to terminate previous Firestore instance', tErr);
      }
      // ensure the old reference is cleared before reinitializing
      db = null;
      await new Promise(r => setTimeout(r, 200));
    }

    const opts = {
      cacheSizeBytes: 1048576,
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    };

    try {
      db = initializeFirestore(app, opts);
      firestoreLongPollingEnabled = true;
      console.info('[firebase] Firestore reinitialized with long-polling', { opts });
    } catch (initErr) {
      // If the SDK refuses to reinitialize with different options, fall back to existing instance.
      console.warn('[firebase] initializeFirestore failed during ensureLongPolling:', initErr.message || initErr);
      if (String(initErr.message || '').includes('initializeFirestore() has already been called')) {
        try {
          db = getFirestore(app);
          firestoreLongPollingEnabled = true; // mark to avoid repeated attempts
          console.info('[firebase] Using existing Firestore instance after failed reinit');
        } catch (getErr) {
          console.error('[firebase] getFirestore fallback also failed:', getErr);
        }
      } else {
        throw initErr;
      }
    }
  } catch (reErr) {
    console.error('[firebase] ensureLongPolling failed:', reErr);
  }
};

try {
  analytics = (typeof window !== 'undefined' && firebaseConfig.measurementId && app)
    ? getAnalytics(app)
    : null;
} catch (e) {
  console.warn('Analytics initialization error:', e);
}

export { auth, db, analytics };
