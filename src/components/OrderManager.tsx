
import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Eye,
  FileText,
  Loader2,
  ShoppingCart
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { Order } from '@/src/types';
import { format } from 'date-fns';

const orderStatusColors = {
  'Pending': 'bg-slate-100 text-slate-700',
  'Processing': 'bg-blue-100 text-blue-700',
  'Shipped': 'bg-amber-100 text-amber-700',
  'Delivered': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const statusIcons = {
  'Pending': Clock,
  'Processing': Package,
  'Shipped': Truck,
  'Delivered': CheckCircle2,
  'Cancelled': XCircle,
};

export function OrderManager() {
  const { user: currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = dataService.subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (currentUser?.role === 'Admin') return true;
    return order.agentId === currentUser?.id;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Orders Tracking</h1>
          <p className="text-slate-500">Monitor order fulfillment, shipping, and delivery lifecycle.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Truck className="w-4 h-4" /> Ship All Pending
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[200px] flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4 p-10">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Fetching orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-20 text-center text-slate-500">
            <ShoppingCart className="w-12 h-12 text-slate-200" />
            <p className="font-semibold text-slate-900">No orders recorded</p>
            <p>{currentUser?.role === 'Admin' ? 'Wait for new orders or sync your e-commerce store.' : 'You haven\'t processed any orders yet.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                {currentUser?.role === 'Admin' && <TableHead>Agent</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const Icon = statusIcons[order.status];
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900">₹{order.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn(orderStatusColors[order.status], "gap-1 border-transparent px-2.5 py-0.5 font-medium")}>
                        <Icon className="w-3.5 h-3.5" /> {order.status}
                      </Badge>
                    </TableCell>
                    {currentUser?.role === 'Admin' && (
                      <TableCell className="text-sm font-medium text-emerald-600">
                        {order.agentName || 'System'}
                      </TableCell>
                    )}
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
