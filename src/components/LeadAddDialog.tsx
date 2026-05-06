import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lead, InventoryItem, User, LeadStatus } from '@/src/types';
import { toast } from 'sonner';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { History, AlertCircle, Calendar, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (lead: any) => Promise<void>;
}

export function LeadAddDialog({ open, onOpenChange, onAdd }: LeadAddDialogProps) {
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    pincode: '',
    product: '',
    quantity: 1,
    value: 0,
    source: 'Direct',
    paymentMode: 'COD' as 'COD' | 'Prepaid',
    status: 'New Lead' as LeadStatus,
    assignedToId: '',
    assignedTo: ''
  });
  const [team, setTeam] = useState<User[]>([]);
  const [existingHistory, setExistingHistory] = useState<{ leads: Lead[] }>({ leads: [] });
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      setExistingHistory({ leads: [] });
      dataService.getInventoryList().then(items => {
        setInventory(items);
        if (items.length > 0 && !formData.product) {
          setFormData(prev => ({ 
            ...prev, 
            product: items[0].name,
            value: items[0].price 
          }));
        }
      });

      if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
        dataService.getTeamMembers().then(setTeam);
      }
    }
  }, [open, currentUser]);

  const handlePhoneChange = async (phone: string) => {
    setFormData(prev => ({ ...prev, phone }));
    
    if (phone.length >= 10) {
      setCheckingDuplicates(true);
      try {
        const history = await dataService.getCustomerHistory(phone);
        setExistingHistory({ leads: history.leads });
        if (history.leads.length > 0) {
          toast.info(`Customer already in CRM with ${history.leads.length} previous leads.`);
        }
      } catch (e) {
        console.error("Duplicate check failed", e);
      } finally {
        setCheckingDuplicates(false);
      }
    } else {
      setExistingHistory({ leads: [] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    setLoading(true);
    try {
      await onAdd(formData);
      onOpenChange(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        pincode: '',
        product: inventory[0]?.name || '',
        quantity: 1,
        value: inventory[0]?.price || 0,
        source: 'Direct',
        paymentMode: 'COD',
        status: 'New Lead',
        assignedToId: '',
        assignedTo: ''
      });
      toast.success('Lead added successfully');
    } catch (error) {
      toast.error('Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = (productName: string) => {
    const item = inventory.find(i => i.name === productName);
    if (item) {
      const qty = formData.quantity;
      setFormData({ 
        ...formData, 
        product: productName, 
        value: item.price * qty 
      });
    }
  };

  const handleQtyChange = (val: string) => {
    const qty = parseInt(val) || 1;
    const item = inventory.find(i => i.name === formData.product);
    const price = item ? item.price : 2999;
    setFormData({ ...formData, quantity: qty, value: price * qty });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">Add New Sales Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customer Name</Label>
              <Input 
                placeholder="Rohan Sharma" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone Number</Label>
              <div className="relative">
                <Input 
                  placeholder="+91 99999 00000" 
                  value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  required
                  className={cn(existingHistory.leads.length > 0 && "border-amber-500 ring-amber-500/10 focus:ring-amber-500")}
                />
                {checkingDuplicates && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {existingHistory.leads.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Existing Customer History</span>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                {existingHistory.leads.map(lead => (
                  <div key={lead.id} className="bg-white border border-amber-100 p-2 rounded-lg flex items-center justify-between group hover:border-amber-300 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-900">{lead.name}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                          lead.status === 'Order Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        )}>
                          {lead.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><UserIcon className="w-2.5 h-2.5" /> {lead.assignedTo}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-900">₹{lead.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Address (Optional)</Label>
            <Input 
              type="email"
              placeholder="customer@example.com" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Shipping Address</Label>
            <textarea 
              placeholder="House No, Street, Landmark..." 
              value={formData.address}
              onChange={e => setFormData({...formData, address: e.target.value})}
              className="w-full min-h-[80px] p-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City / Location</Label>
              <Input 
                placeholder="e.g. Mumbai" 
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pincode</Label>
              <Input 
                placeholder="400001" 
                value={formData.pincode}
                onChange={e => setFormData({...formData, pincode: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Package / Product</Label>
              <select 
                value={formData.product}
                onChange={e => handleProductChange(e.target.value)}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                {inventory.map(item => (
                  <option key={item.id} value={item.name}>{item.name} - ₹{item.price}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</Label>
              <Input 
                type="number" 
                min="1" 
                value={formData.quantity}
                onChange={e => handleQtyChange(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Value (INR)</Label>
              <Input 
                type="number" 
                value={formData.value}
                onChange={e => setFormData({...formData, value: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source</Label>
              <select 
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="Direct">Direct</option>
                <option value="Website">Website</option>
                <option value="Facebook">Facebook</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Mode</Label>
            <select 
              value={formData.paymentMode}
              onChange={e => setFormData({...formData, paymentMode: e.target.value as any})}
              className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
            >
              <option value="COD">COD (Delhivery)</option>
              <option value="Prepaid">Prepaid (PhonePe)</option>
            </select>
          </div>

          {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign To Agent</Label>
              <select 
                value={formData.assignedToId}
                onChange={e => {
                  const agent = team.find(t => t.id === e.target.value);
                  setFormData({
                    ...formData, 
                    assignedToId: e.target.value,
                    assignedTo: agent?.name || ''
                  });
                }}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="">Auto-Assign (Round Robin)</option>
                {team.filter(t => t.role === 'Sales').map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 h-12 rounded-xl text-xs font-black uppercase tracking-widest">
              {loading ? 'Adding Lead...' : 'Create Sales Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
