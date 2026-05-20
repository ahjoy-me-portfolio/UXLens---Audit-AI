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

    const handleLocalState = () => {
      const savedUser = localStorage.getItem('local_auth_user');
      const savedProfile = localStorage.getItem('local_user_profile');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        } else {
          setProfile({
            fullName: 'Guest Designer',
            email: 'guest@uxlens.local',
            role: 'user',
            createdAt: new Date().toISOString(),
            languagePreference: 'en',
            darkMode: true,
            notifications: true
          });
        }
        setIsAdmin(false);
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    // Event listeners to dynamically update the React tree when logging in/out locally
    window.addEventListener('local-login', handleLocalState);
    window.addEventListener('local-logout', handleLocalState);

    const handleProfileUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setProfile(customEvent.detail);
      }
    };
    window.addEventListener('local-profile-updated', handleProfileUpdate);

    // If there is an active local session on boot, prioritize it
    const hasLocalUser = localStorage.getItem('local_auth_user');
    if (hasLocalUser) {
      handleLocalState();
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          // A real Firebase user logged in -> Clear any local auth sandbox keys to prevent collision
          localStorage.removeItem('local_auth_user');
          localStorage.removeItem('local_user_profile');

          setUser(u);
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
          } catch (e) {
            console.warn('Admin check failed:', e);
          }
          
          setIsAdmin(isAdminUser);

          // Setup profile Listener
          const userRef = doc(db, 'users', u.uid);
          unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            } else {
              // Seed if missing
              setDoc(userRef, {
                fullName: u.displayName || 'Anonymous User',
                email: u.email || '',
                avatarUrl: u.photoURL || '',
                role: 'user',
                createdAt: serverTimestamp(),
                languagePreference: 'en',
                darkMode: true,
                notifications: true
              });
            }
          }, (err) => {
            console.warn("Firestore profile snapshot permission error, ignoring:", err);
          });
        } else {
          // If no Firebase user and no active local session, reset state
          if (!localStorage.getItem('local_auth_user')) {
            setUser(null);
            setProfile(null);
            setIsAdmin(false);
          }
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }
        }
      } catch (e) {
        console.error('Auth check error:', e);
      } finally {
        if (!localStorage.getItem('local_auth_user')) {
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      window.removeEventListener('local-login', handleLocalState);
      window.removeEventListener('local-logout', handleLocalState);
      window.removeEventListener('local-profile-updated', handleProfileUpdate);
    };
  }, []);

  const t = (key: keyof typeof translations['en']) => {
    const lang = (profile?.languagePreference as Language) || 'en';
    return translations[lang][key] || translations['en'][key];
  };

  return { user, loading, isAdmin, profile, t };
}
