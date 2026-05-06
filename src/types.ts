export type LeadStatus = 
  | 'New Lead' 
  | 'Interested' 
  | 'Order Confirmed' 
  | 'Dispatched'
  | 'Shipped'
  | 'Delivered'
  | 'RTO/Cancelled'
  | 'Call Back'
  | 'No Answer'
  | 'Not Interested'
  | 'Fake/Spam'
  | 'Unavailable'
  | 'Language Issue'
  | 'Duplicate'
  | 'Wrong Number';

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Returned' | 'Cancelled' | 'RTO';

export interface HistoryItem {
  id: string;
  type: 'status_change' | 'assignment' | 'note_added' | 'call_log' | 'order_placed' | 'export' | 'other';
  from?: string;
  to?: string;
  updatedBy: string;
  updatedById: string;
  timestamp: string;
  note?: string;
  callDuration?: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  stock: number;
  minStock: number;
  price: number;
  category: string;
}

export interface Lead {
  id: string;
  serialId?: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  state?: string;
  status: LeadStatus;
  source: string;
  assignedTo: string;
  assignedToId: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  history?: HistoryItem[];
  value: number;
  product?: string;
  quantity?: number;
  paymentMode: 'COD' | 'Prepaid';
  affiliateId?: string;
  lastCallDate?: string;
  ltv?: number; // Lifetime Value
  callbackTime?: string;
  isArchived?: boolean;
}

export interface Order {
  id: string;
  orderSerial?: string;
  leadId: string;
  customerId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  product: string;
  quantity: number;
  total: number;
  paymentMode: 'COD' | 'Prepaid';
  status: OrderStatus;
  createdAt: string;
  assignedToId: string;
  assignedTo: string;
  commission: number; // Commission earned by rep
  trackingId?: string;
  courier?: string;
  deliveredAt?: string;
  rtoReason?: string;
  deliveryNotes?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  userId: string;
  leadId?: string;
  status: 'pending' | 'completed';
  type: 'refill' | 'callback' | 'other';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Sales' | 'Inventory' | 'Marketer' | 'Delivery';
  status: 'active' | 'pending' | 'blocked';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  lastSeen?: string;
  isOnline?: boolean;
  earnings?: {
    daily: number;
    monthly: number;
    total: number;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityId: string;
  entityType: string;
  details: string;
  timestamp: string;
}

export interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: number;
}
