
export type LeadStatus = 'New' | 'Interested' | 'No Answer' | 'Call Back' | 'Confirmed' | 'Wrong Number' | 'Rejected';

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
  source: string;
  assignedTo: string;
  assignedToId: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  package?: string;
  callbackTime?: string;
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
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Inventory';
  avatar?: string;
  status: 'active' | 'pending' | 'blocked';
}
