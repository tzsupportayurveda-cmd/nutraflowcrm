
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setError(null);
      
      if (fbUser) {
        // Get profile from Firestore
        let profile = await dataService.getUserProfile(fbUser.uid);
        const isAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        
        if (!profile) {
          // Create default profile for first-time login
          profile = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CRM User',
            email: fbUser.email || '',
            role: isAdmin ? 'Admin' : 'Sales',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
            status: isAdmin ? 'active' : 'pending'
          };
          await dataService.createUserProfile(profile);
        }

        // Check for permission (status must be active or user must be the Super Admin)
        if (profile.status !== 'active' && !isAdmin) {
          setUser(null);
          setError('Aapka account admin ki approval ka intezaar kar raha hai. Kripya admin se sampark karein.');
        } else {
          setUser(profile);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setError(err.message);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Galat email ya password. Kripya phir se koshish karein.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });
      // Profile creation is handled by onAuthStateChanged effect
    } catch (err: any) {
      console.error("Signup failed:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Yeh email pehle se register hai. Login karein.');
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setError(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, error, signIn, login, signup, signOut }}>
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
