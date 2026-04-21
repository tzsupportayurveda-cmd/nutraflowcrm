
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { Lead, InventoryItem, Order, User } from '@/src/types';

// Generic error handler
const handleFirestoreError = (error: any, operation: string, path: string | null = null) => {
  const user = auth.currentUser;
  const errorInfo = {
    error: error.message || 'Unknown error',
    operationType: operation,
    path: path,
    authInfo: {
      userId: user?.uid || 'anonymous',
      email: user?.email || '',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || true,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };
  console.error("Firestore Error:", JSON.stringify(errorInfo));
  throw new Error(JSON.stringify(errorInfo));
};

export const dataService = {
  // --- User Profiles ---
  async getUserProfile(uid: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as User : null;
    } catch (e) {
      return handleFirestoreError(e, 'get', `users/${uid}`);
    }
  },

  async createUserProfile(user: User): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', user.id), { ...user });
    } catch (e) {
      // If it doesn't exist, use setDoc or similar logic
      try {
        const { id, ...data } = user;
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', id), data);
      } catch (innerE) {
        handleFirestoreError(innerE, 'create', `users/${user.id}`);
      }
    }
  },

  // --- Leads ---
  subscribeLeads(callback: (leads: Lead[]) => void) {
    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        const leads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Lead));
        callback(leads);
      },
      (error) => handleFirestoreError(error, 'list', 'leads')
    );
  },

  async addLead(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'leads'), {
        ...lead,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', 'leads');
    }
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
    try {
      const docRef = doc(db, 'leads', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, 'update', `leads/${id}`);
    }
  },

  async deleteLead(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'leads', id));
    } catch (e) {
      handleFirestoreError(e, 'delete', `leads/${id}`);
    }
  },

  // --- Inventory ---
  subscribeInventory(callback: (items: InventoryItem[]) => void) {
    return onSnapshot(collection(db, 'inventory'), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as InventoryItem));
        callback(items);
      },
      (error) => handleFirestoreError(error, 'list', 'inventory')
    );
  },

  async updateStock(itemId: string, newStock: number): Promise<void> {
    try {
      await updateDoc(doc(db, 'inventory', itemId), { stock: newStock });
    } catch (e) {
      handleFirestoreError(e, 'update', `inventory/${itemId}`);
    }
  },

  async toggleUserStatus(uid: string, currentStatus: string): Promise<void> {
    try {
      const newStatus = currentStatus === 'active' ? 'pending' : 'active';
      await updateDoc(doc(db, 'users', uid), { status: newStatus });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${uid}`);
    }
  },

  // --- Orders ---
  subscribeOrders(callback: (orders: Order[]) => void) {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        callback(orders);
      },
      (error) => handleFirestoreError(error, 'list', 'orders')
    );
  },

  async addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', 'orders');
    }
  }
};
