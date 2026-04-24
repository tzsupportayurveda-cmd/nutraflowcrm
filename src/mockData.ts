import { Lead, InventoryItem, Order, User } from './types';

export const MOCK_USERS: User[] = [
  { id: '1', name: 'Zaid Khan', email: 'zaid@nutraflow.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zaid', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Sarah Smith', email: 'sarah@nutraflow.com', role: 'Sales', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
];

export const MOCK_LEADS: Lead[] = [
  { id: 'L1', serialId: '01', name: 'Raj Kumar', email: 'raj@example.com', phone: '+91 9876543210', status: 'New Lead', value: 5000, source: 'Website', assignedTo: 'Zaid Khan', assignedToId: '1', createdAt: '2024-03-20T10:00:00Z', address: '123 Main St', city: 'Mumbai', pincode: '400001', paymentMode: 'COD' },
  { id: 'L2', serialId: '02', name: 'Anita Desai', email: 'anita@example.com', phone: '+91 9876543211', status: 'Call Back', value: 12000, source: 'Referral', assignedTo: 'Sarah Smith', assignedToId: '2', createdAt: '2024-03-19T14:30:00Z', address: '456 West St', city: 'Delhi', pincode: '110001', paymentMode: 'COD' },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  { id: 'P1', name: 'Omega-3 Fish Oil', category: 'Supplements', sku: 'NF-O3-001', stock: 150, minStock: 50, price: 2999 },
  { id: 'P2', name: 'Whey Protein Isolate', category: 'Protein', sku: 'NF-WP-002', stock: 45, minStock: 20, price: 5499 },
];

export const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-001', 
    orderSerial: '01',
    leadId: 'L1',
    customerId: 'C1', 
    customerName: 'Raj Kumar', 
    phone: '+91 9876543210',
    address: '123 Main St',
    city: 'Mumbai',
    pincode: '400001',
    product: 'Booster 3X Pills',
    quantity: 1,
    total: 2999,
    status: 'Delivered', 
    createdAt: '2024-03-15T15:20:00Z', 
    paymentMode: 'COD',
    assignedToId: '1',
    assignedTo: 'Zaid Khan',
    commission: 150
  },
];
