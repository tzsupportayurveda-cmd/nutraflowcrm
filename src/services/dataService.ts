
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
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '@/src/lib/firebase';
import { Lead, InventoryItem, Order, User, HistoryItem } from '@/src/types';

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

  // --- Utility for Sequential IDs ---
  async getNextId(counterPath: string, startFrom: number): Promise<string> {
    try {
      const { runTransaction } = await import('firebase/firestore');
      const counterRef = doc(db, 'metadata', 'counters');
      const nextId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let count = startFrom;
        
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { [counterPath]: startFrom + 1 });
        } else {
          const data = counterDoc.data();
          count = data && data[counterPath] ? data[counterPath] : startFrom;
          transaction.update(counterRef, { [counterPath]: count + 1 });
        }
        return count;
      });
      
      if (counterPath === 'leads') {
        return nextId < 10 ? `0${nextId}` : `${nextId}`;
      }
      return `${nextId}`;
    } catch (e) {
      console.error("Failed to generate sequential ID:", e);
      return Math.floor(Math.random() * 1000).toString();
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
      const serialId = await this.getNextId('leads', 1);
      let finalAffiliateId = lead.affiliateId;
      if (!finalAffiliateId) {
        finalAffiliateId = await this.getNextId('affiliates', 101);
      }

      const docRef = await addDoc(collection(db, 'leads'), {
        ...lead,
        serialId,
        affiliateId: finalAffiliateId,
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

  async addLeadHistory(id: string, historyItem: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<void> {
    try {
      const docRef = doc(db, 'leads', id);
      const newItem: HistoryItem = {
        ...historyItem,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString()
      };
      await updateDoc(docRef, {
        history: arrayUnion(newItem)
      });
    } catch (e) {
      handleFirestoreError(e, 'update_history', `leads/${id}`);
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

  async addInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'inventory'), item);
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', 'inventory');
    }
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (e) {
      handleFirestoreError(e, 'update', `orders/${orderId}`);
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

  async deleteUser(uid: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (e) {
      handleFirestoreError(e, 'delete', `users/${uid}`);
    }
  },

  async updateUserRole(uid: string, role: User['role']): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${uid}`);
    }
  },

  async updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), updates);
    } catch (e) {
      handleFirestoreError(e, 'update', `users/${uid}`);
    }
  },

  async getTeamMembers(): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      return handleFirestoreError(e, 'list', 'users');
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
      const orderId = await this.getNextId('order_serial', 1);
      const docRef = await addDoc(collection(db, 'orders'), {
        ...order,
        orderSerial: orderId, // Adding a unique sequential serial for orders
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', 'orders');
    }
  }
};
