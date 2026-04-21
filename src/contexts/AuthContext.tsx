
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
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setFirebaseUser(fbUser);
      setError(null);
      
      try {
        if (fbUser) {
          const isAdminUser = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          
          // Get profile from Firestore
          let profile = await dataService.getUserProfile(fbUser.uid);
          
          if (!profile) {
            // Create default profile for first-time login
            profile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CRM User',
              email: fbUser.email || '',
              role: isAdminUser ? 'Admin' : 'Sales',
              avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
              status: isAdminUser ? 'active' : 'pending'
            };
            await dataService.createUserProfile(profile);
          }

          // Check for permission (status must be active or user must be the Super Admin)
          if (profile.status !== 'active' && !isAdminUser) {
            setUser(null);
            setAdminUser(null);
            setError('Aapka account admin ki approval ka intezaar kar raha hai. Kripya admin se sampark karein.');
          } else {
            if (isAdminUser) setAdminUser(profile);
            setUser(profile);
          }
        } else {
          setUser(null);
          setAdminUser(null);
          setImpersonatedUser(null);
        }
      } catch (err: any) {
        console.error("Auth flow error:", err);
        setError("Login failed due to database connection issue. Please try again or check Firebase Rules.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
