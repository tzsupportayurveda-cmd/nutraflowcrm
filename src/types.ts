
export type LeadStatus = 'New' | 'Interested' | 'No Answer' | 'Call Back' | 'Confirmed' | 'Wrong Number' | 'Rejected';

export interface HistoryItem {
  id: string;
  type: 'status_change' | 'assignment' | 'note_added' | 'other';
  from?: string;
  to?: string;
  updatedBy: string;
  updatedById: string;
  timestamp: string;
  note?: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  pincode?: string;
  status: LeadStatus;
  value: number;
  source: string; // e.g., 'Capsule Ads', 'Gel Ads', 'Website'
  affiliateId?: string; // Tracking ID or number
  paymentMode: 'COD' | 'Prepaid';
  assignedTo: string;
  assignedToId: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  package?: string;
  product?: 'Thunder of Zosh Gel' | 'Thunder of Zosh Capsule (30 pills)';
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
  customerId: string;
  customerName: string;
  items: { productId: string; quantity: number; price: number }[];
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
  agentId?: string;
  agentName?: string;
  source?: string;
  affiliateId?: string;
  paymentMode: 'COD' | 'Prepaid';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Sales' | 'Inventory' | 'Marketer';
  avatar?: string;
  status: 'active' | 'pending' | 'blocked';
}
