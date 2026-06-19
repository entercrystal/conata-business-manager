/**
 * Utility functions for Firestore operations and error handling
 */

/**
 * Check if the browser is connected to the internet
 */
export const isOnline = () => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

/**
 * Retry a Firestore operation with exponential backoff
 * Useful for handling temporary offline errors
 */
import { ensureLongPolling } from '@/lib/firebase';

export const retryFirestoreOperation = async (operation, maxRetries = 3, delayMs = 500) => {
  let lastError;
  let longPollingTried = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.debug(`[retryFirestoreOperation] Attempt ${attempt}/${maxRetries}`);
      // Race the operation against a short timeout per attempt to avoid indefinite hangs
      const attemptTimeoutMs = Math.max(5000, delayMs * Math.pow(2, attempt));
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('operation_attempt_timed_out')), attemptTimeoutMs))
      ]);
      return result;
    } catch (error) {
      lastError = error;
      console.warn('[retryFirestoreOperation] Operation error', { error });

      // Check if error is retriable
      const message = String(error?.message || '').toLowerCase();
      const code = String(error?.code || '').toLowerCase();

      const isRetriable = (
        code === 'unavailable' ||
        code === 'failed-precondition' ||
        code === 'unimplemented' ||
        code === 'aborted' ||
        code === 'deadline-exceeded' ||
        message.includes('offline') ||
        message.includes('failed to get document') ||
        message.includes('client is offline') ||
        message.includes('indexeddb') ||
        message.includes('persistence') ||
        message === 'operation_attempt_timed_out' ||
        message.includes('ns_binding_aborted')
      );

      // If this looks like the Firefox/WebChannel abort issue, attempt to reinit Firestore with long-polling once
      const looksLikeTransportAbort = message.includes('ns_binding_aborted') || message === 'operation_attempt_timed_out' || message.includes('failed to get document');
      if (looksLikeTransportAbort && !longPollingTried) {
        try {
          longPollingTried = true;
          console.info('[retryFirestoreOperation] Detected transport/persistence issue - calling ensureLongPolling() and will retry once more');
          await ensureLongPolling();
          // give SDK a moment
          await new Promise(resolve => setTimeout(resolve, 250));
          // increase maxRetries to allow one more attempt after reinit
          maxRetries = Math.max(maxRetries, attempt + 1);
          continue; // retry immediately
        } catch (lpErr) {
          console.warn('[retryFirestoreOperation] ensureLongPolling failed', lpErr);
        }
      }

      if (!isRetriable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff: 500ms, 1000ms, 2000ms, etc.
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      console.debug(`[retryFirestoreOperation] Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

/**
 * Provide user-friendly error message based on Firestore error
 */
export const getFirestoreErrorMessage = (error) => {
  if (!error) return 'An unknown error occurred';

  const message = error.message || '';
  const code = error.code || '';

  // Map error codes to user-friendly messages
  if (code === 'unavailable') {
    return 'The database service is temporarily unavailable. Please try again in a few moments.';
  }
  
  if (code === 'permission-denied') {
    return 'You do not have permission to perform this action. Please contact your administrator.';
  }
  
  if (code === 'not-found') {
    return 'The resource you are looking for does not exist.';
  }
  
  if (code === 'already-exists') {
    return 'This resource already exists.';
  }
  
  if (code === 'failed-precondition') {
    return 'The operation could not be completed. Please try again.';
  }
  
  if (code === 'invalid-argument') {
    return 'Invalid input provided. Please check your entries and try again.';
  }
  
  if (message.includes('offline')) {
    const online = isOnline();
    if (!online) {
      return 'You are offline. Please check your internet connection and try again.';
    }
    return 'The database connection is offline. This may be a temporary network issue. Please try again.';
  }
  
  if (message.includes('timed out')) {
    return 'The request took too long to complete. Please check your internet connection and try again.';
  }
  
  // Return original message if no mapping
  return message || 'An error occurred. Please try again.';
};

/**
 * Log detailed error information for debugging
 */
export const logFirestoreError = (context, error) => {
  try {
    console.error(`[${context}] Firestore error:`, {
      message: error?.message || String(error),
      code: error?.code || null,
      isOnline: isOnline(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString(),
      raw: error,
    });
  } catch (e) {
    console.error(`[${context}] Firestore error (logging failed):`, String(error));
  }
};
