import React, { useState } from 'react';
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
import { LeadStatus } from '../types';
import { toast } from 'sonner';

interface LeadAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (lead: any) => Promise<void>;
}

export function LeadAddDialog({ open, onOpenChange, onAdd }: LeadAddDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    pincode: '',
    product: 'Advanced Gel Formula' as any,
    quantity: 1,
    value: 2999,
    source: 'Direct',
    paymentMode: 'COD' as 'COD' | 'Prepaid',
    status: 'New Lead' as LeadStatus
  });

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
        product: 'Advanced Gel Formula',
        quantity: 1,
        value: 2999,
        source: 'Direct',
        paymentMode: 'COD',
        status: 'New Lead'
      });
      toast.success('Lead added successfully');
    } catch (error) {
      toast.error('Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (val: string) => {
    const qty = parseInt(val) || 1;
    let newVal = 2999;
    if (qty === 2) newVal = 3999;
    else if (qty > 2) newVal = 3999 + ((qty - 2) * 1500);
    setFormData({ ...formData, quantity: qty, value: newVal });
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
              <Input 
                placeholder="+91 99999 00000" 
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">City / Location</Label>
            <Input 
              placeholder="e.g. Mumbai, Maharashtra" 
              value={formData.city}
              onChange={e => setFormData({...formData, city: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product</Label>
              <select 
                value={formData.product}
                onChange={e => setFormData({...formData, product: e.target.value as any})}
                className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100"
              >
                <option value="Advanced Gel Formula">Advanced Gel Formula</option>
                <option value="Zosh Tablets (30 Caps)">Zosh Tablets (30 Caps)</option>
                <option value="Booster 3X Pills">Booster 3X Pills</option>
                <option value="Booster Cream">Booster Cream</option>
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
          </div>

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
