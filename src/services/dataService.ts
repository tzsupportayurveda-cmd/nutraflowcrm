
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
import { Lead, InventoryItem, Order, User, HistoryItem, Task, AuditLog } from '@/src/types';

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
        return nextId.toString().padStart(2, '0');
      }
      return `${nextId}`;
    } catch (e) {
      console.error("Failed to generate sequential ID:", e);
      return Math.floor(Math.random() * 1000).toString().padStart(2, '0');
    }
  },

  // --- Notifications ---
  async addNotification(userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        type,
        read: false,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }
  },

  subscribeNotifications(userId: string, callback: (notifications: any[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    return onSnapshot(q, 
      (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(notifications);
      },
      (error) => {
        console.error("Notifications subscription error:", error);
        callback([]);
      }
    );
  },

  async markNotificationRead(id: string) {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error("Failed to mark notification read:", e);
    }
  },

  async clearNotifications(userId: string) {
    try {
      const q = query(collection(db, 'notifications'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (e) {
      console.error("Failed to clear notifications:", e);
    }
  },

  // --- Leads ---
  subscribeLeads(user: User | null, callback: (leads: Lead[]) => void) {
    if (!user) return () => {};
    
    let q;
    if (['Admin', 'Manager', 'Marketer'].includes(user.role)) {
      q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    } else {
      // Sales reps only see their leads. 
      // Removing orderBy temporarily to avoid composite index requirement if it's missing.
      q = query(collection(db, 'leads'), where('assignedToId', '==', user.id));
    }
    
    return onSnapshot(q, 
      (snapshot) => {
        const leads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Lead));
        callback(leads);
      },
      (error) => {
        console.error("Leads subscription error:", error);
        callback([]);
      }
    );
  },

  async addLead(lead: Omit<Lead, 'id' | 'createdAt'>): Promise<string> {
    try {
      const serialId = await this.getNextId('leads', 1);
      let finalAffiliateId = lead.affiliateId;
      if (!finalAffiliateId) {
        finalAffiliateId = await this.getNextId('affiliates', 101);
      }

      // Automatically assign if no assignment provided
      let finalAssignedTo = lead.assignedTo;
      let finalAssignedToId = lead.assignedToId;

      if (!finalAssignedToId) {
        const assignment = await this.assignLeadRoundRobin();
        if (assignment) {
          finalAssignedTo = assignment.name;
          finalAssignedToId = assignment.id;
        }
      }

      const docRef = await addDoc(collection(db, 'leads'), {
        ...lead,
        assignedTo: finalAssignedTo || 'Unassigned',
        assignedToId: finalAssignedToId || '',
        serialId,
        affiliateId: finalAffiliateId,
        createdAt: new Date().toISOString(),
        history: lead.history || []
      });
      return docRef.id;
    } catch (e) {
      return handleFirestoreError(e, 'create', 'leads');
    }
  },

  async assignLeadRoundRobin(): Promise<{ id: string; name: string } | null> {
    try {
      const salesQuery = query(collection(db, 'users'), where('role', '==', 'Sales'), where('status', '==', 'active'));
      const snapshot = await getDocs(salesQuery);
      const salesMembers = snapshot.docs.map(d => ({ id: d.id, name: (d.data() as User).name }));
      
      if (salesMembers.length === 0) return null;

      const counterRef = doc(db, 'metadata', 'round_robin');
      const { runTransaction } = await import('firebase/firestore');
      
      const assignedMember = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let currentIndex = 0;
        
        if (counterDoc.exists()) {
          const data = counterDoc.data();
          currentIndex = data?.lastIndex ?? 0;
        }

        const nextIndex = (currentIndex + 1) % salesMembers.length;
        transaction.set(counterRef, { lastIndex: nextIndex }, { merge: true });
        
        return salesMembers[currentIndex];
      });

      return assignedMember;
    } catch (e) {
      console.error("Round Robin Assignment failed:", e);
      return null;
    }
  },

  async bulkUpdateLeads(leadIds: string[], updates: Partial<Lead>): Promise<void> {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const currentUser = auth.currentUser;
      
      leadIds.forEach(id => {
        const ref = doc(db, 'leads', id);
        const updatePayload: any = { 
          ...updates, 
          updatedAt: timestamp 
        };

        if (updates.status || updates.assignedToId) {
          const historyItem: HistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            type: updates.status ? 'status_change' : 'assignment',
            updatedBy: currentUser?.displayName || currentUser?.email || 'System',
            updatedById: currentUser?.uid || 'system',
            timestamp,
            note: `Bulk action: ${updates.status ? `Status to ${updates.status}` : (updates.assignedToId ? `Assigned to ${updates.assignedTo}` : 'Updated')}`
          };
          updatePayload.history = arrayUnion(historyItem);
        }

        // If status is Call Back, create a default task for tomorrow
        if (updates.status === 'Call Back') {
          const callbackDate = new Date();
          callbackDate.setDate(callbackDate.getDate() + 1); // Default to tomorrow
          updatePayload.callbackTime = callbackDate.toISOString();
          
          const taskRef = doc(collection(db, 'tasks'));
          batch.set(taskRef, {
            title: `Bulk Callback Task`,
            description: `Scheduled callback for lead.`,
            dueDate: callbackDate.toISOString(),
            userId: updates.assignedToId || currentUser?.uid || 'system',
            leadId: id,
            status: 'pending',
            type: 'callback'
          });
        }

        batch.update(ref, updatePayload);
      });
      
      await batch.commit();

      if (updates.assignedToId) {
        await this.addNotification(
          updates.assignedToId,
          'Bulk leads assigned',
          `${leadIds.length} leads have been assigned to you via bulk action.`,
          'info'
        );
      }
    } catch (e) {
      handleFirestoreError(e, 'bulk_update', 'leads');
    }
  },

  async getCustomerHistory(phone?: string, email?: string): Promise<{ leads: Lead[], orders: Order[] }> {
    try {
      let leads: Lead[] = [];
      let orders: Order[] = [];

      if (phone) {
        const leadQ = query(collection(db, 'leads'), where('phone', '==', phone));
        const orderQ = query(collection(db, 'orders'), where('phone', '==', phone));
        const [leadSnap, orderSnap] = await Promise.all([getDocs(leadQ), getDocs(orderQ)]);
        leads = leadSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
        orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      } else if (email) {
        const leadQ = query(collection(db, 'leads'), where('email', '==', email));
        const orderQ = query(collection(db, 'orders'), where('customerId', '==', email)); // Assuming customerId might be email
        const [leadSnap, orderSnap] = await Promise.all([getDocs(leadQ), getDocs(orderQ)]);
        leads = leadSnap.docs.map(d => ({ id: d.id, ...d.data() } as Lead));
        orders = orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      }

      return { leads, orders };
    } catch (e) {
      console.error("History fetch failed:", e);
      return { leads: [], orders: [] };
    }
  },

  async getInventoryList(): Promise<InventoryItem[]> {
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
    } catch (e) {
      return handleFirestoreError(e, 'list', 'inventory');
    }
  },

  // --- Audit Logs ---
  async addAuditLog(action: string, entityId: string, entityType: string, details: string) {
    try {
      const user = auth.currentUser;
      const userData = user ? await this.getUserProfile(user.uid) : null;
      
      await addDoc(collection(db, 'logs'), {
        userId: user?.uid || 'system',
        userName: userData?.name || user?.email || 'System',
        action,
        entityId,
        entityType,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  },

  // --- Tasks & Refills ---
  async addTask(task: Omit<Task, 'id'>) {
    try {
      await addDoc(collection(db, 'tasks'), task);
    } catch (e) {
      handleFirestoreError(e, 'create', 'tasks');
    }
  },

  subscribeTasks(userId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, 'tasks'), 
      where('userId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('dueDate', 'asc')
    );
    return onSnapshot(q, 
      (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        callback(tasks);
      },
      (error) => {
        console.error("Tasks subscription error:", error);
        callback([]);
      }
    );
  },

  async updateTask(id: string, updates: Partial<Task>) {
    try {
      await updateDoc(doc(db, 'tasks', id), updates);
    } catch (e) {
      handleFirestoreError(e, 'update', `tasks/${id}`);
    }
  },

  // --- Lead Status Change with Stock & Tasks ---
  async handleOrderConfirmation(lead: Lead) {
    try {
      const { runTransaction } = await import('firebase/firestore');
      
      await runTransaction(db, async (transaction) => {
        // 1. Find the product in inventory
        const invQuery = query(collection(db, 'inventory'), where('name', '==', lead.product));
        const invSnapshot = await getDocs(invQuery);
        
        if (!invSnapshot.empty) {
          const invDoc = invSnapshot.docs[0];
          const invData = invDoc.data() as InventoryItem;
          const newStock = invData.stock - (lead.quantity || 1);
          
          // 2. Deduct Stock
          transaction.update(invDoc.ref, { stock: Math.max(0, newStock) });
          
          if (newStock <= invData.minStock) {
            console.warn(`LOW STOCK ALERT: ${invData.name} is down to ${newStock}`);
          }
        }

        // 3. Create Order
        const commission = (lead.value * 0.05); // 5% Commission
        const orderId = `ORD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        
        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          leadId: lead.id,
          customerId: lead.email || lead.phone,
          customerName: lead.name,
          phone: lead.phone,
          address: lead.address || '',
          city: lead.city || '',
          pincode: lead.pincode || '',
          product: lead.product || 'Advanced Gel Formula',
          quantity: lead.quantity || 1,
          total: lead.value,
          status: 'Pending',
          paymentMode: lead.paymentMode,
          commission,
          assignedToId: lead.assignedToId,
          assignedTo: lead.assignedTo,
          createdAt: new Date().toISOString()
        });

        // 4. Update Sales Rep Earnings
        const userRef = doc(db, 'users', lead.assignedToId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          const earnings = userData.earnings || { daily: 0, monthly: 0, total: 0 };
          transaction.update(userRef, {
            earnings: {
              daily: earnings.daily + commission,
              monthly: earnings.monthly + commission,
              total: earnings.total + commission
            }
          });
        }

        // 5. Create Refill Task (25 days later)
        const refillDate = new Date();
        refillDate.setDate(refillDate.getDate() + 25);
        
        const taskRef = doc(collection(db, 'tasks'));
        transaction.set(taskRef, {
          title: `Refill Reminder: ${lead.name}`,
          description: `Customer purchased ${lead.product} 25 days ago. Call for refill.`,
          dueDate: refillDate.toISOString(),
          userId: lead.assignedToId,
          leadId: lead.id,
          status: 'pending',
          type: 'refill'
        });

        // 6. Update Lead status and LTV and History
        const leadRef = doc(db, 'leads', lead.id);
        const timestamp = new Date().toISOString();
        const currentUser = auth.currentUser;
        const historyItem: HistoryItem = {
          id: Math.random().toString(36).substring(2, 9),
          type: 'status_change',
          from: lead.status,
          to: 'Order Confirmed',
          updatedBy: currentUser?.displayName || currentUser?.email || 'System',
          updatedById: currentUser?.uid || 'system',
          timestamp,
          note: 'Order confirmed and stock deducted'
        };

        transaction.update(leadRef, {
          status: 'Order Confirmed',
          ltv: (lead.ltv || 0) + lead.value,
          updatedAt: timestamp,
          history: arrayUnion(historyItem)
        });
      });
      
      await this.addAuditLog('Order Confirmed', lead.id, 'Lead', `Order created and stock deducted for ${lead.name}`);
    } catch (e) {
      handleFirestoreError(e, 'confirm_order', `leads/${lead.id}`);
    }
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<void> {
    try {
      const docRef = doc(db, 'leads', id);
      const oldSnap = await getDoc(docRef);
      const oldData = oldSnap.data() as Lead;
      const currentUser = auth.currentUser;
      
      const updatePayload: any = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // If status is Call Back, ensure task and callbackTime
      if (updates.status === 'Call Back') {
        const callbackTime = updates.callbackTime || new Date(Date.now() + 86400000).toISOString();
        updatePayload.callbackTime = callbackTime;

        // Create the callback task
        await addDoc(collection(db, 'tasks'), {
          title: `Callback Result: ${oldData.name}`,
          description: `Automatically created follow-up task for ${oldData.name}. Phone: ${oldData.phone}`,
          dueDate: callbackTime,
          userId: oldData.assignedToId || currentUser?.uid || 'system',
          leadId: id,
          status: 'pending',
          type: 'callback'
        });
      }

      await updateDoc(docRef, updatePayload);

      if (updates.status && updates.status !== oldData.status) {
        await this.addAuditLog('Status Change', id, 'Lead', `Status changed from ${oldData.status} to ${updates.status}`);
      }
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

  async bulkDeleteLeads(leadIds: string[]): Promise<void> {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        batch.delete(doc(db, 'leads', id));
      });
      await batch.commit();
      await this.addAuditLog('Bulk Delete', 'multiple', 'Lead', `Deleted ${leadIds.length} leads`);
    } catch (e) {
      handleFirestoreError(e, 'bulk_delete', 'leads');
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

  async deleteInventoryItem(itemId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (e) {
      handleFirestoreError(e, 'delete', `inventory/${itemId}`);
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

  async updateOrderStatus(orderId: string, status: Order['status'], extras: Partial<Order> = {}): Promise<void> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      const orderData = orderSnap.data() as Order;
      const timestamp = new Date().toISOString();
      const currentUser = auth.currentUser;

      await updateDoc(orderRef, { 
        status, 
        ...extras,
        updatedAt: timestamp
      });

      // If leadId exists, update the lead status too
      if (orderData.leadId) {
        const leadRef = doc(db, 'leads', orderData.leadId);
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
          const leadData = leadSnap.data() as Lead;
          const historyItem: HistoryItem = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'status_change',
            from: leadData.status,
            to: status as any, // Cast since LeadStatus might not have all Order statuses but usually they overlap
            updatedBy: currentUser?.displayName || currentUser?.email || 'System',
            updatedById: currentUser?.uid || 'system',
            timestamp,
            note: `Order status updated to ${status}. ${extras.deliveryNotes || ''}`
          };
          await updateDoc(leadRef, {
            status: status as any,
            updatedAt: timestamp,
            history: arrayUnion(historyItem)
          });
        }
      }

      await this.addAuditLog('Order Update', orderId, 'Order', `Status updated to ${status}`);
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

  async updateUserPresence(uid: string): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await updateDoc(doc(db, 'users', uid), { 
        lastSeen: timestamp,
        isOnline: true
      });
    } catch (e) {
      // Don't throw for presence to avoid disrupting experience
      console.error("Presence update failed:", e);
    }
  },

  subscribeUsersPresence(callback: (users: User[]) => void) {
    const q = query(collection(db, 'users'), where('status', '==', 'active'));
    return onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      const users = snapshot.docs.map(doc => {
        const data = doc.data() as User;
        const lastSeen = data.lastSeen ? new Date(data.lastSeen).getTime() : 0;
        // If last seen more than 5 minutes ago, consider offline
        const isOnline = data.isOnline && (now - lastSeen < 5 * 60 * 1000);
        return { ...data, id: doc.id, isOnline } as User;
      });
      callback(users);
    });
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
  subscribeOrders(user: User | null, callback: (orders: Order[]) => void) {
    if (!user) return () => {};
    
    let q;
    if (['Admin', 'Manager', 'Inventory', 'Delivery', 'Marketer'].includes(user.role)) {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('assignedToId', '==', user.id), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, 
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        callback(orders);
      },
      (error) => {
        console.error("Orders subscription error:", error);
        callback([]);
      }
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
