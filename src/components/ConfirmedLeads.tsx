
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Truck, 
  Search, 
  Package, 
  User, 
  Phone,
  LayoutGrid,
  Loader2,
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { dataService } from '@/src/services/dataService';
import { Lead } from '@/src/types';
import { toast } from 'sonner';

export function ConfirmedLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = dataService.subscribeLeads((data) => {
      // Only show confirmed leads
      setLeads(data.filter(l => l.status === 'Confirmed'));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDispatch = async (lead: Lead) => {
    try {
      // 1. Create a real Order from this confirmed lead
      await dataService.addOrder({
        customerId: lead.id,
        customerName: lead.name,
        status: 'Processing',
        total: lead.value,
        items: [{ productId: lead.package || 'Default Pack', quantity: 1, price: lead.value }]
      });

      // 2. Update lead status to indicate it has been converted/dispatched
      await dataService.updateLead(lead.id, { notes: (lead.notes || '') + '\n[Dispatched to Orders]' });
      
      toast.success(`Order created for ${lead.name}`);
    } catch (e) {
      toast.error('Failed to create order');
    }
  };

  const filtered = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Confirmed Orders</h1>
          <p className="text-slate-500">Ready for dispatch and final address verification.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500 hover:bg-emerald-500 h-8 px-4 rounded-full">
            {leads.length} Pending Dispatch
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search confirmed customers..." 
            className="pl-10 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium tracking-tight">Loading orders...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-24 flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-emerald-50 rounded-full">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 tracking-tight">All caught up!</p>
              <p className="text-slate-500 text-sm">No confirmed leads waiting for dispatch at the moment.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Pack Details</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Confirmed By</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <div className="font-bold text-slate-900">{lead.name}</div>
                    <div className="text-xs text-slate-600 truncate max-w-[200px] mt-1">
                      {lead.address}, {lead.city} - {lead.pincode}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-widest px-2.5 py-1">
                      {lead.package || "Not Specified"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600">${lead.value.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <User className="w-3.5 h-3.5 text-slate-400" />
                       <span className="text-sm text-slate-600 font-medium">{lead.assignedTo}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      className="bg-slate-900 hover:bg-slate-800 text-white gap-2 rounded-xl h-10 px-6 shadow-md transition-all active:scale-95"
                      onClick={() => handleDispatch(lead)}
                    >
                      <Truck className="w-4 h-4" /> Final Dispatch
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
