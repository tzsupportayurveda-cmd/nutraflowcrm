
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  UserPlus,
  Loader2,
  ChevronDown,
  MapPin,
  CheckCircle
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
import { Lead, LeadStatus, User } from '@/src/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const statusColors: Record<LeadStatus, string> = {
  'New': 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  'Interested': 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  'No Answer': 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  'Call Back': 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  'Confirmed': 'bg-indigo-600 text-white hover:bg-indigo-700',
  'Dispatched': 'bg-teal-600 text-white hover:bg-teal-700',
  'Wrong Number': 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  'Rejected': 'bg-red-100 text-red-700 hover:bg-red-100',
  'Not Interested': 'bg-slate-100 text-slate-500 hover:bg-slate-100',
  'Cancelled': 'bg-red-50 text-red-500 hover:bg-red-100',
};

export function LeadManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editableLead, setEditableLead] = useState<Lead | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [team, setTeam] = useState<User[]>([]);
  const { user: currentUser } = useAuth();

  // Form state
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    package: '1 Bottle',
    product: 'Advanced Gel Formula' as Lead['product'],
    quantity: 1,
    value: 2999,
    source: 'Direct',
    affiliateId: '',
    paymentMode: 'COD' as 'COD' | 'Prepaid',
    status: 'New' as LeadStatus
  });

  useEffect(() => {
    const unsub = dataService.subscribeLeads((data) => {
      setLeads(data);
      setLoading(false);
    });

    // Also fetch team for assignment (Admin only)
    let teamUnsub = () => {};
    if (currentUser?.role === 'Admin') {
      const q = collection(db, 'users');
      teamUnsub = onSnapshot(q, (snapshot) => {
        setTeam(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      });
    }

    return () => {
      unsub();
      teamUnsub();
    };
  }, [currentUser]);

  useEffect(() => {
    if (selectedLead && isDetailOpen) {
      setEditableLead({ ...selectedLead });
      setHasChanges(false);
    } else {
      setEditableLead(null);
      setHasChanges(false);
    }
  }, [selectedLead, isDetailOpen]);

  const handleUpdateStatus = async (leadId: string, status: LeadStatus, extras: Partial<Lead> = {}) => {
    try {
      const currentLead = leads.find(l => l.id === leadId);
      await dataService.updateLead(leadId, { status, ...extras });
      
      // Log history
      if (currentUser && currentLead && currentLead.status !== status) {
        await dataService.addLeadHistory(leadId, {
          type: 'status_change',
          from: currentLead.status,
          to: status,
          updatedBy: currentUser.name,
          updatedById: currentUser.id,
          note: extras.callbackTime ? `Callback scheduled for: ${extras.callbackTime}` : undefined
        });
      }
      
      toast.success(`Status updated to ${status}`);
      // Also update editable lead if it's the same lead
      if (editableLead && editableLead.id === leadId) {
        setEditableLead(prev => prev ? { ...prev, status, ...extras } : null);
      }
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleAssign = async (leadId: string, agent: User) => {
    try {
      const currentLead = leads.find(l => l.id === leadId);
      await dataService.updateLead(leadId, { 
        assignedTo: agent.name, 
        assignedToId: agent.id 
      });

      // Log history
      if (currentUser && currentLead) {
        await dataService.addLeadHistory(leadId, {
          type: 'assignment',
          from: currentLead.assignedTo || 'Unassigned',
          to: agent.name,
          updatedBy: currentUser.name,
          updatedById: currentUser.id
        });
      }

      toast.success(`Assigned to ${agent.name}`);
      // Update editable lead
      if (editableLead && editableLead.id === leadId) {
        setEditableLead(prev => prev ? { ...prev, assignedTo: agent.name, assignedToId: agent.id } : null);
      }
    } catch (e) {
      toast.error('Assignment failed');
    }
  };

  const handleSaveChanges = async () => {
    if (!editableLead || !selectedLead) return;
    
    try {
      setLoading(true);
      const { id, history, ...updates } = editableLead;
      await dataService.updateLead(id, updates);
      
      // Log some major changes in history if needed
      if (currentUser) {
        await dataService.addLeadHistory(id, {
          type: 'other',
          updatedBy: currentUser.name,
          updatedById: currentUser.id,
          note: 'Manually updated lead details (Name/Contact/Product/Address)'
        });
      }
      
      setHasChanges(false);
      toast.success('Lead details saved successfully');
    } catch (e) {
      toast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      await dataService.addLead({
        ...newLead,
        status: newLead.paymentMode === 'Prepaid' ? 'Confirmed' : newLead.status,
        assignedTo: currentUser.name,
        assignedToId: currentUser.id,
      });
      toast.success(newLead.paymentMode === 'Prepaid' ? 'Prepaid Order landed in Confirmed section!' : 'Lead added successfully!');
      setIsDialogOpen(false);
      setNewLead({ 
        name: '', 
        email: '', 
        phone: '', 
        address: '', 
        city: '', 
        pincode: '', 
        package: '1 Bottle', 
        product: 'Advanced Gel Formula',
        quantity: 1,
        value: 2999, 
        source: 'Direct',
        affiliateId: '',
        paymentMode: 'COD',
        status: 'New' 
      });
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const handleCreateOrder = async (lead: Lead) => {
    try {
      if (!currentUser) return;
      
      const orderId = await dataService.addOrder({
        customerId: lead.id,
        customerName: lead.name,
        items: [], // Would typically select items in a real app
        status: 'Pending',
        total: lead.value || 0,
        agentId: currentUser.id,
        agentName: currentUser.name,
        paymentMode: lead.paymentMode || 'COD',
      });

      // Update lead status to reflect it's now an order
      await dataService.updateLead(lead.id, { status: 'Confirmed' });
      
      toast.success(`Order created successfully! ID: ${orderId}`);
      setIsDetailOpen(false);
    } catch (e) {
      toast.error('Failed to create order');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      try {
        await dataService.deleteLead(id);
        toast.success('Lead deleted');
      } catch (e) {
        toast.error('Delete failed');
      }
    }
  };
  
  const filteredLeads = leads.filter(lead => {
    // 1. Role Filter
    const isOwner = lead.assignedToId === currentUser?.id;
    const isAdmin = currentUser?.role === 'Admin';
    if (!isAdmin && !isOwner) return false;

    // 2. Search Filter
    return (
      (lead.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (lead.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (lead.phone || "").includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-slate-500">Track and manage your potential customers and sales pipeline.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <UserPlus className="w-4 h-4" /> Add New Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Full Name</label>
                  <Input 
                    required
                    placeholder="Rahul Sharma" 
                    value={newLead.name}
                    onChange={e => setNewLead({...newLead, name: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Phone No</label>
                  <Input 
                    required
                    placeholder="+91..." 
                    value={newLead.phone}
                    onChange={e => setNewLead({...newLead, phone: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Email (Optional)</label>
                <Input 
                  type="email"
                  placeholder="rahul@example.com" 
                  value={newLead.email}
                  onChange={e => setNewLead({...newLead, email: e.target.value})}
                  className="border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Full Address</label>
                <Input 
                  placeholder="House No, Street, Area..." 
                  value={newLead.address}
                  onChange={e => setNewLead({...newLead, address: e.target.value})}
                  className="border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">City</label>
                  <Input 
                    placeholder="Mumbai" 
                    value={newLead.city}
                    onChange={e => setNewLead({...newLead, city: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Pincode</label>
                  <Input 
                    placeholder="400001" 
                    value={newLead.pincode}
                    onChange={e => setNewLead({...newLead, pincode: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Product</label>
                  <select 
                    value={newLead.product}
                    onChange={e => {
                      const prod = e.target.value as any;
                      setNewLead({...newLead, product: prod});
                    }}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  >
                    <option value="Advanced Gel Formula">Advanced Gel Formula</option>
                    <option value="Zosh Tablets (30 Caps)">Zosh Tablets (30 Caps)</option>
                    <option value="Booster 3X Pills">Booster 3X Pills</option>
                    <option value="Booster Cream">Booster Cream</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Quantity</label>
                  <Input 
                    type="number"
                    min="1"
                    value={newLead.quantity}
                    onChange={e => {
                      const qty = Number(e.target.value) || 1;
                      let newVal = 2999;
                      if (qty === 2) newVal = 3999;
                      else if (qty > 2) newVal = 3999 + ((qty - 2) * 1500);

                      setNewLead({
                        ...newLead, 
                        quantity: qty, 
                        value: newVal,
                        package: `${qty} Bottle${qty !== 1 ? 's' : ''}`
                      });
                    }}
                    className="border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Lead Source</label>
                  <select 
                    value={newLead.source}
                    onChange={e => setNewLead({...newLead, source: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Direct">Direct/Organic</option>
                    <option value="Website">Website</option>
                    <option value="Capsule Ads">Capsule Ads</option>
                    <option value="Gel Ads">Gel Ads</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Payment Mode</label>
                  <select 
                    value={newLead.paymentMode}
                    onChange={e => setNewLead({...newLead, paymentMode: e.target.value as 'COD' | 'Prepaid'})}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                  >
                    <option value="COD">💵 Cash on Delivery (COD)</option>
                    <option value="Prepaid">💳 Prepaid (Online)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600">Affiliate No. / Code</label>
                <Input 
                  placeholder="AFF-001" 
                  value={newLead.affiliateId}
                  onChange={e => setNewLead({...newLead, affiliateId: e.target.value})}
                  className="border-slate-200"
                />
              </div>

              <DialogFooter className="pt-4 sticky bottom-0 bg-white">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 px-8 shadow-lg shadow-emerald-500/20">Save Lead</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search leads..." 
            className="pl-10 border-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 text-slate-600">
          <Filter className="w-4 h-4" /> Filter
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Loading your leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <Users className="w-12 h-12 text-slate-200" />
            <div>
              <p className="text-slate-900 font-semibold text-lg">No leads found</p>
              <p className="text-slate-500">Try adjusting your search or add a new lead to get started.</p>
            </div>
            <Button variant="outline" className="mt-2" onClick={() => setSearchTerm('')}>Clear Search</Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[200px]">Lead Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="hover:bg-slate-50/50 cursor-pointer"
                onClick={() => {
                  setSelectedLead(lead);
                  setIsDetailOpen(true);
                }}
              >
                <TableCell className="font-medium">
                  <div>{lead.name}</div>
                  <div className="text-xs text-slate-400 font-normal">{lead.id}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3 h-3" /> {lead.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-3 h-3" /> {lead.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Badge variant="secondary" className={cn(statusColors[lead.status])}>
                      {lead.status}
                    </Badge>
                    <Badge className={cn(
                      "w-fit text-[9px] font-black uppercase tracking-tighter px-1.5 h-4 border-none",
                      lead.paymentMode === 'Prepaid' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {lead.paymentMode === 'Prepaid' ? '💳 Prepaid' : '💵 COD'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-slate-700">
                  ${lead.value.toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit text-[10px] font-bold border-slate-200 text-slate-500 h-5 px-1.5 rounded uppercase">
                      {lead.source}
                    </Badge>
                    {lead.affiliateId && (
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded w-fit">
                        #{lead.affiliateId}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {lead.assignedTo}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white z-[100] shadow-xl border-slate-200">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onSelect={() => { setSelectedLead(lead); setIsDetailOpen(true); }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-emerald-600">Convert to Order</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onSelect={() => handleDelete(lead.id)}
                      >
                        Delete Lead
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>

    {/* Lead Details Modal */}
    <Dialog open={isDetailOpen} onOpenChange={(open) => {
      if (!open && hasChanges) {
        if (confirm('You have unsaved changes. Are you sure you want to close?')) {
          setIsDetailOpen(false);
        }
      } else {
        setIsDetailOpen(open);
      }
    }}>
      <DialogContent className="sm:max-w-[700px] rounded-2xl p-0 overflow-hidden">
        {editableLead && (
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Badge className={cn(statusColors[editableLead.status] || 'bg-slate-100 text-slate-700', "border-transparent text-xs px-3 py-1")}>
                    {editableLead.status}
                  </Badge>
                  {hasChanges && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-full text-[10px] uppercase font-black">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)} className="h-8 text-slate-400">Cancel</Button>
                  {hasChanges && (
                    <Button onClick={handleSaveChanges} size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-4 shadow-sm shadow-blue-200">
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer Name</label>
                  <Input 
                    value={editableLead.name}
                    onChange={(e) => {
                      setEditableLead({ ...editableLead, name: e.target.value });
                      setHasChanges(true);
                    }}
                    className="text-2xl font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 shadow-none hover:bg-slate-200/30 transition-colors placeholder:text-slate-300"
                    placeholder="Customer Name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Phone Number</label>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm group">
                      <Phone className="w-3.5 h-3.5 text-emerald-500" />
                      <Input 
                        value={editableLead.phone}
                        onChange={(e) => {
                          setEditableLead({ ...editableLead, phone: e.target.value });
                          setHasChanges(true);
                        }}
                        className="border-none h-auto p-0 focus-visible:ring-0 shadow-none text-xs font-bold"
                        placeholder="Phone Number"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Email Address</label>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm group text-sm">
                      <Mail className="w-3.5 h-3.5 text-blue-500" />
                      <Input 
                        value={editableLead.email}
                        onChange={(e) => {
                          setEditableLead({ ...editableLead, email: e.target.value });
                          setHasChanges(true);
                        }}
                        className="border-none h-auto p-0 focus-visible:ring-0 shadow-none text-xs font-bold"
                        placeholder="Email Address"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Full Address</label>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <Input 
                        value={editableLead.address || ''}
                        placeholder="Street Address"
                        className="border-none h-auto p-0 focus-visible:ring-0 shadow-none text-xs font-bold"
                        onChange={(e) => {
                          setEditableLead({ ...editableLead, address: e.target.value });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">City</label>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Input 
                          value={editableLead.city || ''}
                          placeholder="City"
                          className="border-none h-auto p-0 focus-visible:ring-0 shadow-none text-xs font-bold"
                          onChange={(e) => {
                            setEditableLead({ ...editableLead, city: e.target.value });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Pincode</label>
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <Input 
                          value={editableLead.pincode || ''}
                          placeholder="Pincode"
                          className="border-none h-auto p-0 focus-visible:ring-0 shadow-none text-xs font-bold"
                          onChange={(e) => {
                            setEditableLead({ ...editableLead, pincode: e.target.value });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              {/* Product Section */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Product Selection</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Product Choice</span>
                    <select 
                      value={editableLead.product || ''}
                      onChange={(e) => {
                        setEditableLead({ ...editableLead, product: e.target.value as any });
                        setHasChanges(true);
                      }}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                    >
                      <option value="">Select Product...</option>
                      <option value="Advanced Gel Formula">Advanced Gel Formula</option>
                      <option value="Zosh Tablets (30 Caps)">Zosh Tablets (30 Caps)</option>
                      <option value="Booster 3X Pills">Booster 3X Pills</option>
                      <option value="Booster Cream">Booster Cream</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quantity (Bottles)</span>
                    <div className="flex items-center gap-3">
                      <Input 
                        type="number" 
                        min="1"
                        value={editableLead.quantity || 1}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          let newVal = 2999;
                          if (qty === 2) newVal = 3999;
                          else if (qty > 2) newVal = 3999 + ((qty - 2) * 1500);

                          setEditableLead({ 
                            ...editableLead, 
                            quantity: qty,
                            value: newVal,
                            package: `${qty} Bottle${qty !== 1 ? 's' : ''}`
                          });
                          setHasChanges(true);
                        }}
                        className="h-10 border-slate-200 font-bold rounded-xl"
                      />
                      <div className="flex flex-col grow">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Total Amount</span>
                        <span className="text-lg font-black text-emerald-600">₹{(editableLead.value || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Channel</label>
                  <select 
                    value={editableLead.source}
                    onChange={(e) => {
                      setEditableLead({ ...editableLead, source: e.target.value });
                      setHasChanges(true);
                    }}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  >
                    <option value="Direct">Direct/Organic</option>
                    <option value="Website">Website</option>
                    <option value="Capsule Ads">Capsule Ads</option>
                    <option value="Gel Ads">Gel Ads</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Mode</label>
                  <select 
                    value={editableLead.paymentMode}
                    onChange={(e) => {
                      setEditableLead({ ...editableLead, paymentMode: e.target.value as any });
                      setHasChanges(true);
                    }}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                  >
                    <option value="COD">💵 Cash on Delivery</option>
                    <option value="Prepaid">💳 Prepaid (Online)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Affiliate No.</label>
                  <Input 
                    placeholder="e.g. AFF-001" 
                    value={editableLead.affiliateId || ''}
                    className="h-10 border-slate-200 font-bold"
                    onChange={(e) => {
                      setEditableLead({ ...editableLead, affiliateId: e.target.value });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</label>
                  {currentUser?.role === 'Admin' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="outline" className="w-full justify-between font-medium h-10 border-slate-200 rounded-lg">
                          {editableLead.assignedTo || "Unassigned"} <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel>Select Agent</DropdownMenuLabel>
                        {team.map(member => (
                          <DropdownMenuItem key={member.id} onSelect={() => { handleAssign(editableLead.id, member); }}>
                            {member.name} ({member.role})
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium">
                      {editableLead.assignedTo || "Unassigned"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interaction Log</label>
                <textarea 
                  className="w-full h-32 p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                  placeholder="Describe the conversation..."
                  value={editableLead.notes || ''}
                  onChange={(e) => {
                    setEditableLead({ ...editableLead, notes: e.target.value });
                    setHasChanges(true);
                  }}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">Update Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['No Answer', 'Call Back', 'Interested', 'Confirmed', 'Wrong Number', 'Rejected', 'Not Interested', 'Cancelled'] as LeadStatus[]).map(status => (
                      <Button
                        key={status}
                        variant={editableLead.status === status ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "h-10 text-[10px] font-bold border-slate-200",
                          editableLead.status === status ? statusColors[status] : "bg-white text-slate-600 hover:bg-slate-50"
                        )}
                        onClick={() => {
                          if (status === 'Call Back') {
                            const time = prompt('Enter callback time (e.g. 5:00 PM today)');
                            if (time) handleUpdateStatus(editableLead.id, status, { callbackTime: time });
                          } else {
                            handleUpdateStatus(editableLead.id, status);
                          }
                        }}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900">Final Confirmation</h4>
                      <p className="text-[11px] text-emerald-700/70">Create a dispatch order for this customer.</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleCreateOrder(editableLead)} 
                    disabled={editableLead.status !== 'Confirmed'}
                    className={cn(
                      "font-bold h-10 px-6 rounded-xl shadow-sm",
                      editableLead.status === 'Confirmed' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-200 text-slate-400"
                    )}
                  >
                    Confirm Order
                  </Button>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity History</label>
                <div className="space-y-4">
                  {editableLead.history && editableLead.history.length > 0 ? (
                    [...editableLead.history].reverse().map((item, i) => (
                      <div key={item.id} className="relative flex gap-4 pl-2">
                        {/* Timeline line */}
                        {i !== (editableLead.history?.length || 0) - 1 && (
                          <div className="absolute left-[13px] top-6 bottom-0 w-0.5 bg-slate-100" />
                        )}
                        
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 z-10",
                          item.type === 'status_change' ? "bg-emerald-500" : 
                          item.type === 'assignment' ? "bg-amber-500" : "bg-blue-500"
                        )} />
                        
                        <div className="flex flex-col gap-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {item.type === 'status_change' ? `Status: ${item.from} → ${item.to}` : 
                               item.type === 'assignment' ? `Assigned: ${item.from} → ${item.to}` : 
                               'Note Updated'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500">
                              {item.updatedBy.charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">
                              Updated by <span className="text-slate-900">{item.updatedBy}</span>
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No history records found for this lead.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center sticky bottom-0 z-20">
              <Button 
                variant="ghost" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this lead?')) {
                    handleDelete(editableLead.id);
                    setIsDetailOpen(false);
                  }
                }}
              >
                Delete Lead
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="rounded-xl">Close Modal</Button>
                {hasChanges && (
                  <Button 
                    onClick={handleSaveChanges}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-10 shadow-lg shadow-blue-500/20 font-bold"
                  >
                    Save Everything
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
  );
}
