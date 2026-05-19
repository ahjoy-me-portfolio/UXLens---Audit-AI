import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { translations, Language } from '../lib/i18n';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          // Admin check logic...
          const isSuperAdmin = u.email?.toLowerCase() === 'ahjoy.me@gmail.com';
          let isAdminUser = isSuperAdmin;
          
          try {
            const adminDoc = await getDoc(doc(db, 'admins', u.uid));
            isAdminUser = adminDoc.exists() || isSuperAdmin;
            if (isSuperAdmin && !adminDoc.exists()) {
              await setDoc(doc(db, 'admins', u.uid), { 
                email: u.email, 
                grantedAt: serverTimestamp(),
                isSuper: true 
              });
            }
          } catch (e) { console.warn('Admin check failed'); }
          
          setIsAdmin(isAdminUser);

          // Setup profile listener
          const userRef = doc(db, 'users', u.uid);
          unsubscribeProfile = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
              setProfile(doc.data() as UserProfile);
            } else {
              // Seed if missing
              setDoc(userRef, {
                fullName: u.displayName || 'Anonymous User',
                email: u.email,
                avatarUrl: u.photoURL,
                role: 'user',
                createdAt: serverTimestamp(),
                languagePreference: 'en',
                darkMode: true,
                notifications: true
              });
            }
          });
        } else {
          setIsAdmin(false);
          setProfile(null);
          if (unsubscribeProfile) unsubscribeProfile();
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const t = (key: keyof typeof translations['en']) => {
    const lang = (profile?.languagePreference as Language) || 'en';
    return translations[lang][key] || translations['en'][key];
  };

  return { user, loading, isAdmin, profile, t };
}
