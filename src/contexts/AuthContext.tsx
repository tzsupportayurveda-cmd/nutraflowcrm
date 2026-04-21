
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, signInWithGoogle } from '@/src/lib/firebase';
import { dataService } from '@/src/services/dataService';
import { User } from '@/src/types';

const ADMIN_EMAIL = 'tzsupportayurveda@gmail.com';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  impersonate: (user: User | null) => void;
  isImpersonating: boolean;
  adminUser: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setFirebaseUser(fbUser);
      setError(null);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      try {
        if (fbUser) {
          const isAdminUser = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          
          // Setup real-time profile listener for self-logout support
          const { doc, onSnapshot } = await import('firebase/firestore');
          const { db } = await import('@/src/lib/firebase');
          
          unsubscribeProfile = onSnapshot(doc(db, 'users', fbUser.uid), (snapshot) => {
            if (snapshot.exists()) {
              const profile = { id: snapshot.id, ...snapshot.data() } as User;
              
              // Force logout check
              if (profile.status !== 'active' && !isAdminUser) {
                setUser(null);
                setAdminUser(null);
                firebaseSignOut(auth);
                setError('Aapka account restricted hai. Kripya admin se sampark karein.');
              } else {
                if (isAdminUser) setAdminUser(profile);
                setUser(profile);
              }
            } else {
              // Create default profile if missing during session
              const defaultProfile: User = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CRM User',
                email: fbUser.email || '',
                role: isAdminUser ? 'Admin' : 'Sales',
                avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
                status: isAdminUser ? 'active' : 'pending'
              };
              dataService.createUserProfile(defaultProfile);
            }
          });

        } else {
          setUser(null);
          setAdminUser(null);
          setImpersonatedUser(null);
        }
      } catch (err: any) {
        console.error("Auth flow error:", err);
        setError("Login failed. Check connection.");
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const impersonate = (targetUser: User | null) => {
    if (adminUser?.role === 'Admin') {
      setImpersonatedUser(targetUser);
    }
  };

  const activeUser = impersonatedUser || user;

  const signIn = async () => {
    // ... same
  };

  const login = async (email: string, pass: string) => {
    // ... same
  };

  const signup = async (email: string, pass: string, name: string) => {
    // ... same
  };

  const signOut = async () => {
    try {
      setImpersonatedUser(null);
      await firebaseSignOut(auth);
      setError(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user: activeUser, 
      firebaseUser, 
      loading, 
      error, 
      signIn, 
      login, 
      signup, 
      signOut,
      impersonate,
      isImpersonating: !!impersonatedUser,
      adminUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
