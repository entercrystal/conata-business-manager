import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, where, setDoc, updateDoc, deleteDoc, arrayRemove, serverTimestamp, addDoc, arrayUnion } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { retryFirestoreOperation, getFirestoreErrorMessage, logFirestoreError } from '@/lib/firestore-utils';
import { generateInviteCode } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const { appUser } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [activeBusiness, setActiveBusiness] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load businesses for the current user
  useEffect(() => {
    if (!appUser?.id) return;
    
    const load = async () => {
      try {
        setLoading(true);
        if (!firestore) {
          console.error('[BusinessContext] Firestore is not initialized. Cannot load businesses.');
          setBusinesses([]);
          return;
        }

        // Fetch only businesses where the user is a member or owner
        const col = collection(firestore, 'businesses');
        const q = query(col, where('members', 'array-contains', appUser.id));

        try {
          // Try with the 'members' array query first
          const snaps = await getDocs(q);
          const items = snaps.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Also get businesses where user is owner
          const ownerQ = query(col, where('owner', '==', appUser.id));
          const ownerSnaps = await getDocs(ownerQ);
          const ownerItems = ownerSnaps.docs.map(d => ({ id: d.id, ...d.data() }));
          
          // Merge and deduplicate
          const allBusinesses = [...items];
          ownerItems.forEach(ownerBiz => {
            if (!allBusinesses.find(b => b.id === ownerBiz.id)) {
              allBusinesses.push(ownerBiz);
            }
          });
          
          setBusinesses(allBusinesses);
          if (allBusinesses.length) {
            setSelectedBusiness(allBusinesses[0]);
            setActiveBusiness(allBusinesses[0].id);
          }
        } catch (queryErr) {
          console.warn('Query failed, falling back to collection scan:', queryErr);
          // Fallback: fetch all and filter (slower but works if indexes aren't set up)
          const snaps = await getDocs(col);
          const items = snaps.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(b => b.members?.includes(appUser.id) || b.owner === appUser.id);
          setBusinesses(items);
          if (items.length) {
            setSelectedBusiness(items[0]);
            setActiveBusiness(items[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load businesses:', err);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [appUser?.id]);

  const createBusiness = async (name, description = '') => {
    console.log('[createBusiness] Starting business creation...', { name, description, hasFirestore: !!firestore });
    
    if (!appUser?.id) {
      const error = 'User not authenticated. Please log in again.';
      console.error('[createBusiness]', error);
      throw new Error(error);
    }
    
    if (!firestore) {
      const error = 'Firestore database is not available. Please refresh the page and try again.';
      console.error('[createBusiness]', error);
      throw new Error(error);
    }
    
    try {
      console.log('[createBusiness] Creating business document...');
      const inviteCode = generateInviteCode();
      const newBusiness = {
        name,
        description,
        owner: appUser.id,
        members: [appUser.id],
        inviteCode,
        createdAt: serverTimestamp(),
        createdBy: appUser.id,
      };
      
      // Proceed with Firestore-only creation

      // Write business document with retry logic
      try {
        const businessRef = doc(collection(firestore, 'businesses'));
        await retryFirestoreOperation(() => setDoc(businessRef, newBusiness), 3, 500);
        console.log('[createBusiness] Business document created with ID:', businessRef.id);

        // Update user's businesses array with retry logic
        console.log('[createBusiness] Updating user document...');
        const userRef = doc(firestore, 'users', appUser.id);
        const currentUserBusinesses = appUser.businesses || [];
        try {
          await retryFirestoreOperation(() => updateDoc(userRef, { businesses: [...currentUserBusinesses, businessRef.id] }), 3, 500);
        } catch (err) {
          logFirestoreError('createBusiness:updateUser', err);
          const msg = getFirestoreErrorMessage(err);
          console.error('[createBusiness] updateDoc error message:', msg);
          throw new Error(msg);
        }
        console.log('[createBusiness] User document updated');

        // Update local state
        const createdBusiness = { 
          id: businessRef.id, 
          ...newBusiness,
          // Ensure serverTimestamp is converted to a readable format
          createdAt: new Date().toISOString(),
        };
        
        setBusinesses(prev => [...prev, createdBusiness]);
        setSelectedBusiness(createdBusiness);
        setActiveBusiness(createdBusiness.id);
        
        console.log('[createBusiness] Business created successfully:', createdBusiness);
        return createdBusiness;
      } catch (err) {
        // Log and rethrow Firestore error so UI surfaces it (no fallback)
        logFirestoreError('createBusiness:setDoc', err);
        const userMsg = getFirestoreErrorMessage(err);
        console.error('[createBusiness] setDoc/update error message:', userMsg);
        throw new Error(userMsg);
      }
    } catch (error) {
      logFirestoreError('createBusiness:overall', error);
      const userMsg = getFirestoreErrorMessage(error);
      console.error('[createBusiness] Failed to create business:', userMsg, { err: error });
      const e = new Error(userMsg);
      e.original = error;
      throw e;
    }
  };

  const deleteBusiness = async (businessId) => {
    if (!appUser?.id) {
      throw new Error('User is not authenticated.');
    }

    if (!firestore) {
      throw new Error('Firestore is not initialized.');
    }

    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      const businessSnap = await getDoc(businessRef);
      const businessData = businessSnap.data();
      if (!businessData) {
        throw new Error('Business not found.');
      }
      if (businessData.owner !== appUser.id) {
        throw new Error('Only the business owner can delete this business.');
      }

      await deleteDoc(businessRef);

      const userRef = doc(firestore, 'users', appUser.id);
      const updatedUserBusinesses = (appUser.businesses || []).filter((id) => id !== businessId);
      await updateDoc(userRef, { businesses: updatedUserBusinesses });

      setBusinesses((prev) => prev.filter((biz) => biz.id !== businessId));
      if (selectedBusiness?.id === businessId) {
        const remaining = businesses.filter((biz) => biz.id !== businessId);
        const nextBusiness = remaining.length ? remaining[0] : null;
        setSelectedBusiness(nextBusiness);
        setActiveBusiness(nextBusiness?.id ?? null);
      }
    } catch (err) {
      logFirestoreError('deleteBusiness', err);
      const errorMessage = getFirestoreErrorMessage(err);
      throw new Error(errorMessage || 'Failed to delete business.');
    }
  };

  const leaveBusiness = async (businessId) => {
    if (!appUser?.id) {
      throw new Error('User is not authenticated. Please log in again.');
    }
    if (!firestore) {
      throw new Error('Firestore database is not available. Please refresh the page and try again.');
    }
    if (!businessId) {
      throw new Error('Business ID is required to leave a business.');
    }

    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      const userRef = doc(firestore, 'users', appUser.id);
      const businessSnap = await getDoc(businessRef);
      const businessData = businessSnap.data();
      if (!businessData) {
        throw new Error('Business not found.');
      }
      if (businessData.owner === appUser.id) {
        throw new Error('Business owners cannot leave their own business. Please delete it instead.');
      }

      await retryFirestoreOperation(
        () => updateDoc(businessRef, { members: arrayRemove(appUser.id) }),
        3,
        500
      );

      await retryFirestoreOperation(
        () => updateDoc(userRef, { businesses: arrayRemove(businessId) }),
        3,
        500
      );

      const membershipQuery = query(
        collection(firestore, 'memberships'),
        where('userId', '==', appUser.id),
        where('businessId', '==', businessId)
      );
      const membershipSnaps = await getDocs(membershipQuery);
      for (const membershipDoc of membershipSnaps.docs) {
        await deleteDoc(membershipDoc.ref);
      }

      setBusinesses((prev) => prev.filter((biz) => biz.id !== businessId));
      if (selectedBusiness?.id === businessId) {
        const remaining = businesses.filter((biz) => biz.id !== businessId);
        const nextBusiness = remaining.length ? remaining[0] : null;
        setSelectedBusiness(nextBusiness);
        setActiveBusiness(nextBusiness?.id ?? null);
      }

      return true;
    } catch (err) {
      logFirestoreError('leaveBusiness', err);
      const userMsg = getFirestoreErrorMessage(err);
      throw new Error(userMsg || 'Failed to leave business.');
    }
  };

  const updateBusiness = async (businessId, updates) => {
    if (!appUser?.id) {
      throw new Error('User is not authenticated.');
    }

    if (!firestore) {
      throw new Error('Firestore is not initialized.');
    }

    try {
      const businessRef = doc(firestore, 'businesses', businessId);
      await updateDoc(businessRef, updates);
      setBusinesses((prev) => prev.map((biz) => (biz.id === businessId ? { ...biz, ...updates } : biz)));
      if (selectedBusiness?.id === businessId) {
        setSelectedBusiness({ ...selectedBusiness, ...updates });
      }
    } catch (err) {
      logFirestoreError('updateBusiness', err);
      const errorMessage = getFirestoreErrorMessage(err);
      throw new Error(errorMessage || 'Failed to update business.');
    }
  };

  const joinBusiness = async (inviteCode, jobTitle = '') => {
    if (!appUser?.id) {
      throw new Error('User not authenticated. Please log in again.');
    }
    if (!firestore) {
      throw new Error('Firestore database is not available. Please refresh the page and try again.');
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    if (!normalizedCode) {
      throw new Error('Please enter a valid invite code.');
    }

    try {
      const businessQuery = query(
        collection(firestore, 'businesses'),
        where('inviteCode', '==', normalizedCode)
      );
      const snaps = await getDocs(businessQuery);
      if (snaps.empty) {
        throw new Error('Invalid invite code. Please ask your admin to double-check.');
      }

      const businessDoc = snaps.docs[0];
      const businessId = businessDoc.id;
      const businessData = businessDoc.data();

      const businessRef = doc(firestore, 'businesses', businessId);
      const userRef = doc(firestore, 'users', appUser.id);

      await retryFirestoreOperation(
        () => updateDoc(businessRef, { members: arrayUnion(appUser.id) }),
        3,
        500
      );

      await retryFirestoreOperation(
        () => addDoc(collection(firestore, 'memberships'), {
          userId: appUser.id,
          businessId,
          role: 'worker',
          jobTitle: jobTitle || '',
          hourlyRate: 0,
          salary: 0,
          createdAt: serverTimestamp(),
        }),
        3,
        500
      );

      await retryFirestoreOperation(
        () => updateDoc(userRef, { businesses: arrayUnion(businessId) }),
        3,
        500
      );

      const joinedBusiness = {
        id: businessId,
        ...businessData,
        members: Array.isArray(businessData.members) ? [...new Set([...(businessData.members || []), appUser.id])] : [appUser.id],
      };

      setBusinesses((prev) => {
        const exists = prev.find((biz) => biz.id === businessId);
        if (exists) return prev;
        return [...prev, joinedBusiness];
      });
      setSelectedBusiness(joinedBusiness);
      setActiveBusiness(businessId);

      return joinedBusiness;
    } catch (err) {
      logFirestoreError('joinBusiness', err);
      const userMsg = getFirestoreErrorMessage(err);
      throw new Error(userMsg || 'Failed to join business.');
    }
  };

  const selectBusiness = (b) => {
    setSelectedBusiness(b);
    setActiveBusiness(b?.id ?? null);
  };

  return (
    <BusinessContext.Provider value={{ businesses, selectedBusiness, selectBusiness, activeBusiness, setActiveBusiness, loading, createBusiness, joinBusiness, leaveBusiness, deleteBusiness, updateBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
};
