
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
  CreditCard,
  ExternalLink
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { Order, Lead } from '@/src/types';
import { format } from 'date-fns';
import { LeadDetailDialog } from '@/src/components/LeadDetailDialog';
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
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);

  useEffect(() => {
    const unsub = dataService.subscribeOrders(currentUser, (data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsub();
  }, [currentUser]);

  const filteredOrders = orders.filter(order => {
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.role === 'Inventory' || currentUser?.role === 'Delivery') return true;
    return order.assignedToId === currentUser?.id;
  });

  const [shipData, setShipData] = useState({
    trackingId: '',
    courier: 'Delhivery',
    notes: ''
  });

  const handleDispatch = async (orderId: string) => {
    try {
      await dataService.updateOrderStatus(orderId, 'Shipped', {
        trackingId: shipData.trackingId,
        courier: shipData.courier,
        deliveryNotes: shipData.notes
      });
      toast.success('Order marked as Shipped with tracking info');
      setIsDetailsOpen(false);
      setShipData({ trackingId: '', courier: 'Delhivery', notes: '' });
    } catch (error) {
      toast.error('Failed to update shipping info');
    }
  };

  const handleStatusUpdate = async (orderId: string, status: any) => {
    try {
      await dataService.updateOrderStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
    } catch (e) {
      toast.error('Status update failed');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Order Fulfillment</h1>
            <Badge className="bg-blue-100 text-blue-700 border-none font-black text-[9px] uppercase tracking-widest px-2.5">
              Processing Queue
            </Badge>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-tight">Lifecycle monitoring of confirmed commercial transactions.</p>
        </div>
        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
          <Button className="neo-shadow bg-slate-900 hover:bg-black text-white gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4">
            <Truck className="w-4 h-4 text-blue-400" /> Batch Dispatch
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden neo-shadow min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 gap-4">
             <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Order Records...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-32 text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black text-slate-900 uppercase tracking-tight">No Transactions Recorded</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">
                {currentUser?.role === 'Admin' ? 'Awaiting commercial conversion from lead registry.' : 'Your assignment queue is currently empty.'}
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-14 hover:bg-transparent border-b-slate-100">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-6">Order ID</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Entity Details</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Fulfillment Date</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Financial Value</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Status & Logistics</TableHead>
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Assigned To</TableHead>}
                <TableHead className="w-14 px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const Icon = statusIcons[order.status as keyof typeof statusIcons] || Clock;
                return (
                  <TableRow key={order.id} className="h-20 hover:bg-slate-50/30 group transition-all border-b-slate-50">
                    <TableCell className="px-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 font-mono tracking-tighter">#{order.orderSerial || order.id.substring(0, 8).toUpperCase()}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">TRAN_ID</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{order.customerName}</span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tight">{order.phone || 'NO_PHONE'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700 font-mono uppercase tracking-tighter">
                          {format(new Date(order.createdAt), 'dd MMM yyyy').toUpperCase()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TS_ENTRY</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 font-mono">₹{order.total.toLocaleString()}</span>
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Confirmed Revenue</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase tracking-widest h-6 px-2.5 border-2 w-fit rounded-lg shadow-sm transition-transform group-hover:scale-105",
                          orderStatusColors[order.status as keyof typeof orderStatusColors] || "bg-slate-50 text-slate-400 border-slate-200"
                        )}>
                          <Icon className="w-3 h-3 mr-1.5" /> {order.status}
                        </Badge>
                        {order.trackingId && (
                          <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">
                            <Truck className="w-2.5 h-2.5" /> 
                            {order.courier?.toUpperCase() || 'LOGISTICS'}: <span className="font-mono text-slate-500">{order.trackingId}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                      <TableCell className="px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-white uppercase ring-2 ring-slate-100">
                            {(order.agentName || 'S')[0]}
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{order.agentName || 'SYSTEM_OP'}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="px-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 border border-transparent hover:border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
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
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-2xl font-black flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <ShoppingCart className="w-6 h-6 text-blue-600" />
                    </div>
                    Order #{selectedOrder?.orderSerial}
                  </DialogTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsLeadDialogOpen(true)}
                    className="font-black uppercase text-[10px] tracking-widest gap-2 bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Patient Lead
                  </Button>
                </div>
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

                {selectedOrder.status === 'Pending' && (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dispatch Logistics</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Tracking ID</label>
                        <Input 
                          placeholder="e.g. 123456789" 
                          value={shipData.trackingId}
                          onChange={e => setShipData({...shipData, trackingId: e.target.value})}
                          className="bg-white/10 border-white/10 text-white h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Courier</label>
                        <select 
                          value={shipData.courier}
                          onChange={e => setShipData({...shipData, courier: e.target.value})}
                          className="w-full h-8 bg-white/10 border border-white/10 rounded-md px-2 text-xs font-bold outline-none"
                        >
                          <option value="Delhivery" className="bg-slate-900">Delhivery</option>
                          <option value="Shiprocket" className="bg-slate-900">Shiprocket</option>
                          <option value="BlueDart" className="bg-slate-900">BlueDart</option>
                        </select>
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 font-black uppercase text-[10px] h-9"
                      onClick={() => handleDispatch(selectedOrder.id)}
                    >
                      Process Shipment
                    </Button>
                  </div>
                )}

                {selectedOrder.status === 'Shipped' && (currentUser?.role === 'Admin' || currentUser?.role === 'Delivery') && (
                   <div className="flex gap-2">
                     <Button 
                       className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs h-9"
                       onClick={() => handleStatusUpdate(selectedOrder.id, 'Delivered')}
                     >
                       Mark Delivered
                     </Button>
                     <Button 
                       variant="outline"
                       className="flex-1 border-red-200 text-red-600 font-bold text-xs h-9"
                       onClick={() => handleStatusUpdate(selectedOrder.id, 'RTO')}
                     >
                       Mark RTO
                     </Button>
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

      {isLeadDialogOpen && (
        <LeadDetailDialog 
          open={isLeadDialogOpen}
          onOpenChange={setIsLeadDialogOpen}
          leadId={selectedOrder?.leadId || null}
        />
      )}
    </div>
  );
}
