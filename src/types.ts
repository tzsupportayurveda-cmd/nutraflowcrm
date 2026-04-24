
export type LeadStatus = 
  | 'New Lead' 
  | 'Attempt 1' 
  | 'Attempt 2' 
  | 'Attempt 3' 
  | 'Interested' 
  | 'Order Confirmed' 
  | 'Dispatched'
  | 'RTO/Cancelled'
  | 'Call Back'
  | 'Not Interested';

export interface HistoryItem {
  id: string;
  type: 'status_change' | 'assignment' | 'note_added' | 'call_log' | 'order_placed' | 'other';
  from?: string;
  to?: string;
  updatedBy: string;
  updatedById: string;
  timestamp: string;
  note?: string;
  callDuration?: number; // in seconds
}

export interface Lead {
  id: string;
  serialId?: string; // Numeric ID starting from 01
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  status: LeadStatus;
  value: number;
  source: string; // e.g., 'Capsule Ads', 'Gel Ads', 'Website'
  affiliateId?: string; // Sequential numeric ID starting from 101
  paymentMode: 'COD' | 'Prepaid';
  assignedTo: string;
  assignedToId: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  package?: string;
  product?: 'Advanced Gel Formula' | 'Zosh Tablets (30 Caps)' | 'Booster 3X Pills' | 'Booster Cream';
  quantity?: number;
  callbackTime?: string;
  history?: HistoryItem[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  minStock: number;
  price: number;
}

export interface Order {
  id: string;
  orderSerial?: string;
  customerId: string;
  customerName: string;
  items: { productId: string; quantity: number; price: number }[];
  status: 'Pending' | 'Processing' | 'Shipped' | 'Dispatched' | 'Out for Delivery' | 'Delivered' | 'Returned' | 'RTO' | 'Cancelled';
  total: number;
  agentId?: string;
  agentName?: string;
  source?: string;
  affiliateId?: string;
  paymentMode: 'COD' | 'Prepaid';
  shippingAddress?: string;
  phone?: string;
  trackingId?: string;
  courier?: string;
  deliveryNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Sales' | 'Inventory' | 'Marketer' | 'Delivery';
  avatar?: string;
  status: 'active' | 'pending' | 'blocked';
}

export interface OTPRecord {
  email: string;
  otp: string;
  expiresAt: number;
}
