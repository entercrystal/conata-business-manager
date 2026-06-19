import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db as firestore, isFirebaseConfigured } from '@/lib/firebase';
import { getInitials } from '@/lib/utils';

const AuthContext = createContext();

const userDocRef = (uid) => {
  if (!firestore) {
    console.error('[userDocRef] Firestore is not initialized');
    return null;
  }
  return doc(firestore, 'users', uid);
};

const createAppUserDocument = async (firebaseUser, options = {}) => {
  const { fullName = '' } = options;
  const userRef = userDocRef(firebaseUser.uid);
  const profile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    fullName: fullName || firebaseUser.displayName || '',
    avatarInitials: getInitials(fullName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || ''),
    businesses: [],
    createdAt: serverTimestamp(),
  };
  await setDoc(userRef, profile, { merge: true });
  return { id: firebaseUser.uid, ...profile };
};

const loadAppUser = async (firebaseUser) => {
  if (!firebaseUser) {
    console.log('[loadAppUser] No firebaseUser provided');
    return null;
  }

  if (!firestore) {
    console.error('[loadAppUser] Firestore is not initialized, returning basic profile');
    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      fullName: firebaseUser.displayName || '',
      avatarInitials: getInitials(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || ''),
      businesses: [],
      createdAt: null,
    };
  }

  const userRef = userDocRef(firebaseUser.uid);
  if (!userRef) {
    console.error('[loadAppUser] Could not create user document reference');
    return null;
  }
  console.log('[loadAppUser] Starting Firestore getDoc for uid:', firebaseUser.uid);
  try {
    // Race getDoc against a short timeout to avoid blocking the app when IndexedDB/persistence is blocked
    const GETDOC_TIMEOUT_MS = 4000;
    const snapshot = await Promise.race([
      getDoc(userRef),
      new Promise((_, reject) => setTimeout(() => reject(new Error('getdoc_timed_out')), GETDOC_TIMEOUT_MS))
    ]);
    console.log('[loadAppUser] getDoc completed', { exists: snapshot.exists() });

    if (snapshot.exists && snapshot.exists()) {
      // User already exists in Firestore - return existing data
      const userData = snapshot.data();
      return {
        id: firebaseUser.uid,
        ...userData,
      };
    } else if (snapshot && snapshot.exists && !snapshot.exists()) {
      // User doesn't exist - create new user document
      console.log('[loadAppUser] User document does not exist, creating new profile');
      return createAppUserDocument(firebaseUser, {});
    } else {
      // Unexpected snapshot shape - fallback
      console.warn('[loadAppUser] Unexpected snapshot result, falling back to basic profile');
      return {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || '',
        avatarInitials: getInitials(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || ''),
        businesses: [],
        createdAt: null,
      };
    }
  } catch (err) {
    // Handle transient/offline errors gracefully so the app isn't blocked
    console.warn('[loadAppUser] getDoc failed, falling back to basic profile', {
      code: err.code,
      message: err.message,
      uid: firebaseUser.uid,
    });

    const basicProfile = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      fullName: firebaseUser.displayName || '',
      avatarInitials: getInitials(firebaseUser.displayName || firebaseUser.email?.split('@')[0] || ''),
      businesses: [],
      createdAt: null,
    };

    // Attempt a background write when online to ensure the user doc exists
    setTimeout(async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await createAppUserDocument(firebaseUser, { fullName: basicProfile.fullName });
          }
        }
      } catch (e) {
        console.warn('background createAppUserDocument failed', e);
      }
    }, 5000);

    return basicProfile;
  }
};

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setAuthError({
        type: 'firebase_config_error',
        message: 'Firebase is not configured properly. Check your Firebase environment variables and project settings.',
      });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return undefined;
    }

    if (!auth) {
      console.error('[AuthContext] Firebase auth object is null. Firebase may not be initialized properly.');
      setAuthError({
        type: 'auth_init_error',
        message: 'Firebase Authentication failed to initialize. Please refresh the page or disable browser extensions that might block Firebase.',
      });
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return undefined;
    }

    // Safety timeout: if auth doesn't initialize within 15s, stop the spinner so the UI can show the login page
    console.log('[AuthContext] Initializing Firebase auth listener...');
    console.debug('[AuthContext] auth object presence before listener:', { authExists: !!auth });
    const initTimeout = setTimeout(() => {
      console.warn('[AuthContext] Auth initialization timeout reached after 15s – Firebase may be blocked by browser shields or extensions');
      setAuthError({ 
        type: 'auth_init_timeout', 
        message: 'Authentication initialization is taking too long. Try disabling browser extensions (ad blockers, VPNs, shields) and refresh the page.' 
      });
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }, 15000);

    let unsubscribed = false;

    const unsubscribe = onAuthStateChanged(
      auth, 
      async (currentUser) => {
        if (unsubscribed) return;
        
        console.log('[AuthContext] onAuthStateChanged fired', { uid: currentUser?.uid });
        clearTimeout(initTimeout);
        setIsLoadingAuth(true);
        setAuthError(null);
        setFirebaseUser(currentUser);

        if (currentUser) {
          try {
            const loadedUser = await loadAppUser(currentUser);
            setAppUser(loadedUser);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('Failed to load app user', error);
            setAppUser(null);
            setIsAuthenticated(false);
            setAuthError({ type: 'load_user_error', message: error.message || 'Unable to load user profile' });
          }
        } else {
          setAppUser(null);
          setIsAuthenticated(false);
        }

        setAuthChecked(true);
        setIsLoadingAuth(false);
      },
      (error) => {
        // Firebase auth state listener error callback
        if (unsubscribed) return;
        
        console.error('[AuthContext] onAuthStateChanged error:', error);
        clearTimeout(initTimeout);
        setAuthError({
          type: 'auth_listener_error',
          message: error.message || 'Failed to initialize authentication listener. Try refreshing the page.',
        });
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    );

    return () => {
      unsubscribed = true;
      clearTimeout(initTimeout);
      unsubscribe();
    };
  }, []);

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setAppUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const loadedUser = await loadAppUser(currentUser);
      setAppUser(loadedUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to reload user', error);
      setAppUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'load_user_error', message: error.message || 'Unable to load user profile' });
    } finally {
      setAuthChecked(true);
      setIsLoadingAuth(false);
    }
  };

  const signInWithEmailPassword = async (email, password) => {
    if (!isFirebaseConfigured) {
      const error = new Error('Firebase configuration is missing.');
      error.code = 'auth/configuration-not-found';
      throw error;
    }
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const loadedUser = await loadAppUser(credential.user);
      setAppUser(loadedUser);
      setIsAuthenticated(true);
      return loadedUser;
    } catch (error) {
      console.error('Email sign-in failed', error);
      setAuthError({ type: 'sign_in_failed', message: error.message || 'Unable to sign in' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signUpWithEmailPassword = async ({ email, password, fullName }) => {
    if (!isFirebaseConfigured) {
      const error = new Error('Firebase configuration is missing.');
      error.code = 'auth/configuration-not-found';
      throw error;
    }
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const createdUser = await createAppUserDocument(credential.user, { fullName });
      setAppUser(createdUser);
      setIsAuthenticated(true);
      return createdUser;
    } catch (error) {
      console.error('Registration failed', error);
      setAuthError({ type: 'sign_up_failed', message: error.message || 'Unable to create account' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      const error = new Error('Firebase configuration is missing.');
      error.code = 'auth/configuration-not-found';
      throw error;
    }
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        const loadedUser = await loadAppUser(result.user);
        setAppUser(loadedUser);
        setIsAuthenticated(true);
        return loadedUser;
      }
    } catch (error) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        console.warn('Google popup auth blocked or closed. Falling back to redirect.', error);
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }
      console.error('Google sign-in failed', error);
      setAuthError({ type: 'google_sign_in_failed', message: error.message || 'Unable to sign in with Google' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const sendPasswordReset = async (email) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset request failed', error);
      setAuthError({ type: 'reset_request_failed', message: error.message || 'Unable to send reset email' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const confirmPasswordResetToken = async (code, newPassword) => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      await confirmPasswordReset(auth, code, newPassword);
    } catch (error) {
      console.error('Password reset confirmation failed', error);
      setAuthError({ type: 'reset_confirm_failed', message: error.message || 'Unable to reset password' });
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const updateAppUser = async (updates) => {
    if (!appUser?.uid) {
      throw new Error('No authenticated user to update');
    }
    const ref = userDocRef(appUser.uid);
    await updateDoc(ref, updates);
    const nextAppUser = { ...appUser, ...updates };
    setAppUser(nextAppUser);
    return nextAppUser;
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setAppUser(null);
      setFirebaseUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      window.location.href = '/login';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        authChecked,
        signInWithEmailPassword,
        signUpWithEmailPassword,
        signInWithGoogle,
        sendPasswordReset,
        confirmPasswordResetToken,
        updateAppUser,
        checkUserAuth,
        logout,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
