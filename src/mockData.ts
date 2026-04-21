
import { Lead, InventoryItem, Order, User } from './types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Zaid Khan', email: 'zaid@nutraflow.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zaid', status: 'active' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@nutraflow.com', role: 'Sales', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', status: 'active' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'L1', name: 'Raj Kumar', email: 'raj@example.com', phone: '+91 9876543210', status: 'New', value: 5000, source: 'Website', assignedTo: 'Zaid Khan', assignedToId: '1', createdAt: '2024-03-20T10:00:00Z', address: '123 Main St', city: 'Mumbai', pincode: '400001' },
  { id: 'L2', name: 'Anita Desai', email: 'anita@example.com', phone: '+91 9876543211', status: 'Call Back', value: 12000, source: 'Referral', assignedTo: 'Sarah Smith', assignedToId: '2', createdAt: '2024-03-19T14:30:00Z', address: '456 West St', city: 'Delhi', pincode: '110001' },
  { id: 'L3', name: 'Vikram Singh', email: 'vikram@example.com', phone: '+91 9876543212', status: 'Interested', value: 25000, source: 'LinkedIn', assignedTo: 'Zaid Khan', assignedToId: '1', createdAt: '2024-03-18T09:15:00Z', address: '789 North St', city: 'Bangalore', pincode: '560001' },
  { id: 'L4', name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 9876543213', status: 'Confirmed', value: 8500, source: 'Google Ads', assignedTo: 'Sarah Smith', assignedToId: '2', createdAt: '2024-03-17T11:45:00Z', address: '321 South St', city: 'Chennai', pincode: '600001' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'P1', name: 'Omega-3 Fish Oil', category: 'Supplements', sku: 'NF-O3-001', stock: 150, minStock: 50, price: 29.99 },
  { id: 'P2', name: 'Whey Protein Isolate', category: 'Protein', sku: 'NF-WP-002', stock: 45, minStock: 20, price: 54.99 },
  { id: 'P3', name: 'Multivitamin Complex', category: 'Wellness', sku: 'NF-MV-003', stock: 12, minStock: 30, price: 19.99 },
  { id: 'P4', name: 'Ashwagandha Extract', category: 'Ayurvedic', sku: 'NF-AS-004', stock: 80, minStock: 15, price: 24.99 },
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-001', customerId: 'C1', customerName: 'Raj Kumar', items: [{ productId: 'P1', quantity: 2, price: 29.99 }], status: 'Delivered', total: 59.98, createdAt: '2024-03-15T15:20:00Z' },
  { id: 'ORD-002', customerId: 'C2', customerName: 'Anita Desai', items: [{ productId: 'P2', quantity: 1, price: 54.99 }], status: 'Shipped', total: 54.99, createdAt: '2024-03-18T12:00:00Z' },
  { id: 'ORD-003', customerId: 'C3', customerName: 'Vikram Singh', items: [{ productId: 'P4', quantity: 3, price: 24.99 }], status: 'Processing', total: 74.97, createdAt: '2024-03-20T16:45:00Z' },
];
