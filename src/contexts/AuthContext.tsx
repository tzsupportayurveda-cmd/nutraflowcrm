
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, signInWithGoogle } from '@/src/lib/firebase';
import { dataService } from '@/src/services/dataService';
import { User } from '@/src/types';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'tzsupportayurveda@gmail.com';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
      
      // Only clear error if we are switching users or logging in a real user
      // Avoid clearing error when sign-out is triggered by restriction logic
      if (fbUser) {
        setError(null);
      }
      
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
              
              if (isAdminUser) setAdminUser(profile);
              setUser(profile);
              
              // No longer forcing logout here to allow "Pending Approval" UI
              if (profile.status !== 'active' && !isAdminUser) {
                setError('Account approval pending. Kripya admin se sampark karein.');
              }
            } else {
              // ... same default profile logic
              const defaultProfile: User = {
                id: fbUser.uid,
                name: fbUser.displayName || fbUser.email?.split('@')[0] || 'CRM User',
                email: fbUser.email || '',
                role: isAdminUser ? 'Admin' : 'Sales',
                avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`,
                status: isAdminUser ? 'active' : 'pending',
                createdAt: new Date().toISOString()
              };
              dataService.createUserProfile(defaultProfile);
            }
            setLoading(false); // Set loading false ONLY after we have profile data
          });
        } else {
          setUser(null);
          setAdminUser(null);
          setImpersonatedUser(null);
          setLoading(false); // Set loading false if not logged in
        }
      } catch (err: any) {
        console.error("Auth flow error:", err);
        setError("Login failed. Check connection.");
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
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google login failed:", err);
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success("Login request processed...");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError("Aapka login fail ho gaya hai. Kripya email aur password check karein.");
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      toast.success("Account request sent for approval!");
    } catch (err: any) {
      console.error("Signup failed:", err);
      setError("Registration fail ho gaya. Shaayad ye email pehle se exist karta hai.");
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const actionCodeSettings = {
        url: window.location.href, 
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      toast.success("Password reset link aapke email par bhej diya gaya hai! Kripya Spam folder bhi check karein.");
    } catch (err: any) {
      console.error("Password reset failed:", err);
      let errorMessage = "Password reset fail ho gaya. Kripya details check karein.";
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = "Ye email ID hamare system mein nahi mili.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Email ID galat hai.";
      }
      
      setError(errorMessage);
      toast.error("Password reset failed");
    } finally {
      setLoading(false);
    }
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
      resetPassword,
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
