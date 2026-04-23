
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
  ShoppingCart,
  Send,
  User,
  MapPin,
  Phone,
  CreditCard
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

const orderStatusColors = {
  'Pending': 'bg-slate-100 text-slate-700',
  'Processing': 'bg-blue-100 text-blue-700',
  'Shipped': 'bg-amber-100 text-amber-700',
  'Dispatched': 'bg-teal-100 text-teal-700',
  'Delivered': 'bg-emerald-100 text-emerald-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

const statusIcons = {
  'Pending': Clock,
  'Processing': Package,
  'Shipped': Truck,
  'Dispatched': Send,
  'Delivered': CheckCircle2,
  'Cancelled': XCircle,
};

export function OrderManager() {
  const { user: currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    const unsub = dataService.subscribeOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredOrders = orders.filter(order => {
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') return true;
    return order.agentId === currentUser?.id;
  });

  const handleDispatch = async (orderId: string) => {
    try {
      await dataService.updateOrderStatus(orderId, 'Dispatched');
      toast.success('Order marked as Dispatched');
      setIsDetailsOpen(false);
    } catch (error) {
      toast.error('Failed to dispatch order');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Orders Tracking</h1>
          <p className="text-slate-500">Monitor order fulfillment, shipping, and delivery lifecycle.</p>
        </div>
        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Truck className="w-4 h-4" /> Ship All Pending
          </Button>
        )}
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
            <p className="font-semibold text-slate-900 text-lg">No orders recorded</p>
            <p className="max-w-xs mx-auto text-slate-400">{currentUser?.role === 'Admin' ? 'Wait for new orders or sync your e-commerce store.' : 'You haven\'t processed any orders yet.'}</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold">Order ID</TableHead>
                <TableHead className="font-bold">Customer</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Total</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && <TableHead className="font-bold">Agent</TableHead>}
                <TableHead className="text-right font-bold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const Icon = statusIcons[order.status] || Clock;
                return (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 group transition-colors">
                    <TableCell className="font-mono text-sm font-black text-blue-600">
                      {order.orderSerial || order.id.substring(0, 5)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{order.customerName}</TableCell>
                    <TableCell className="text-slate-500 text-sm font-medium">
                      {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="font-black text-slate-900">₹{order.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className={cn(orderStatusColors[order.status], "gap-1 border-transparent px-2.5 py-0.5 font-bold shadow-sm w-fit")}>
                          <Icon className="w-3 h-3" /> {order.status}
                        </Badge>
                        {order.trackingId && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                            <Truck className="w-2.5 h-2.5" /> {order.courier || 'Tracking'}: {order.trackingId}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                      <TableCell className="text-sm font-bold text-emerald-600">
                        {order.agentName || 'System'}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDetailsOpen(true);
                        }}
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl border-slate-200">
          <DialogHeader className="border-b border-slate-100 pb-4">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              Order #{selectedOrder?.orderSerial}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="grid grid-cols-2 gap-8 py-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Customer Details
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                    <p className="font-black text-slate-900 text-lg">{selectedOrder.customerName}</p>
                    <p className="text-sm text-slate-500 font-bold flex items-center gap-2">
                      <Phone className="w-3 h-3" /> {selectedOrder.phone || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Shipping Destination
                  </h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-sm leading-relaxed text-slate-700 font-medium">
                      {selectedOrder.shippingAddress || 'No address provided'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" /> Financial & Logistics
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="font-bold border-slate-200">{selectedOrder.paymentMode}</Badge>
                    <Badge className={cn(orderStatusColors[selectedOrder.status], "font-black")}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div className="pt-2">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Total Amount</span>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">₹{selectedOrder.total.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Items</h3>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg">
                        <span className="font-bold text-slate-700">Item #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-medium text-xs">₹{item.price}</span>
                          <Badge variant="secondary" className="bg-slate-200 text-slate-800 font-black">x{item.quantity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.trackingId && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2 mt-4">
                    <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                       <Truck className="w-3.5 h-3.5" /> Live Tracking Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-emerald-600/70 font-bold uppercase">Courier</span>
                        <p className="font-black text-emerald-900">{selectedOrder.courier}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600/70 font-bold uppercase">Tracking ID</span>
                        <p className="font-black text-emerald-900">{selectedOrder.trackingId}</p>
                      </div>
                    </div>
                    {selectedOrder.deliveryNotes && (
                      <div className="pt-2 border-t border-emerald-100 mt-1">
                        <span className="text-[10px] text-emerald-600/70 font-bold uppercase">Delivery Note</span>
                        <p className="text-xs font-bold text-emerald-800 italic">"{selectedOrder.deliveryNotes}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4 pt-6 border-t border-slate-100 sm:justify-end gap-3">
            <Button variant="ghost" className="font-bold text-slate-500 hover:text-slate-900" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
            {selectedOrder?.status !== 'Dispatched' && selectedOrder?.status !== 'Delivered' && 
             (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 h-11 shadow-md hover:shadow-lg transition-all gap-2"
                onClick={() => handleDispatch(selectedOrder.id)}
              >
                <Send className="w-4 h-4" /> Dispatch Order Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
