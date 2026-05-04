
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
  CheckCircle,
  TrendingUp
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
import { Lead, LeadStatus, User, Order, InventoryItem } from '@/src/types';
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
import { LeadAddDialog } from './LeadAddDialog';
import { LeadDetailDialog } from './LeadDetailDialog';
import { motion, AnimatePresence } from 'motion/react';

const statusColors: Record<LeadStatus, string> = {
  'New Lead': 'bg-blue-50 text-blue-700 border-blue-200',
  'Interested': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Order Confirmed': 'bg-emerald-600 text-white border-emerald-600',
  'Dispatched': 'bg-blue-600 text-white border-blue-600',
  'Shipped': 'bg-cyan-600 text-white border-cyan-600',
  'Delivered': 'bg-emerald-500 text-white border-emerald-500',
  'RTO/Cancelled': 'bg-red-50 text-red-700 border-red-200',
  'Call Back': 'bg-purple-50 text-purple-700 border-purple-200',
  'No Answer': 'bg-orange-50 text-orange-700 border-orange-200',
  'Not Interested': 'bg-slate-100 text-slate-500 border-slate-200',
  'Fake/Spam': 'bg-gray-100 text-gray-500 border-gray-200',
  'Unavailable': 'bg-amber-50 text-amber-700 border-amber-200',
  'Language Issue': 'bg-indigo-50 text-indigo-700 border-indigo-200',
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
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [customerHistory, setCustomerHistory] = useState<{ leads: Lead[], orders: Order[] }>({ leads: [], orders: [] });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [tempCallbackTime, setTempCallbackTime] = useState('');
  const [targetLeadId, setTargetLeadId] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'All',
    source: 'All',
    product: 'All',
    salesRep: 'All',
    dateRange: 'All'
  });

  useEffect(() => {
    const unsub = dataService.subscribeLeads(currentUser, (data) => {
      // Sort manually since we removed it from some queries to avoid index issues
      const sorted = [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setLeads(sorted);
      setLoading(false);
    });

    dataService.getInventoryList().then(setInventory);

    // Also fetch team for assignment (Admin only)
    let teamUnsub = () => {};
    if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
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
      
      // Fetch customer history
      dataService.getCustomerHistory(selectedLead.phone, selectedLead.email)
        .then(setCustomerHistory);
    } else {
      setEditableLead(null);
      setHasChanges(false);
      setCustomerHistory({ leads: [], orders: [] });
    }
  }, [selectedLead, isDetailOpen]);

  const handleUpdateStatus = async (leadId: string, status: LeadStatus, extras: Partial<Lead> = {}) => {
    if (status === 'Call Back' && !extras.callbackTime) {
      setTargetLeadId(leadId);
      setTempCallbackTime('');
      setCallbackDialogOpen(true);
      return;
    }

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
          note: extras.callbackTime ? `Callback scheduled for: ${new Date(extras.callbackTime).toLocaleString()}` : undefined
        });

        // Update local editable state
        if (editableLead?.id === leadId) {
          setEditableLead(prev => prev ? ({ ...prev, status, ...extras }) : null);
          setHasChanges(false);
        }

        // Create a task if callback is set
        if (status === 'Call Back' && extras.callbackTime) {
          await dataService.addTask({
            title: `Callback requested for ${currentLead.name}`,
            description: `Scheduled callback for ${currentLead.name}. Phone: ${currentLead.phone}`,
            dueDate: extras.callbackTime,
            userId: currentUser.id,
            leadId: leadId,
            status: 'pending',
            type: 'callback'
          });
        }
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

  const submitCallback = () => {
    if (!tempCallbackTime || !targetLeadId) return;
    handleUpdateStatus(targetLeadId, 'Call Back', { callbackTime: tempCallbackTime });
    setCallbackDialogOpen(false);
    setTargetLeadId(null);
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
      
      // Send notification to the assigned agent
      await dataService.addNotification(
        agent.id,
        'New Lead Assigned',
        `Lead ${currentLead.name} (#${currentLead.serialId}) has been assigned to you.`,
        'info'
      );

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

  const handleAddLead = async (formData: any) => {
    if (!currentUser) return;
    
    try {
      await dataService.addLead({
        ...formData,
        status: formData.paymentMode === 'Prepaid' ? 'Order Confirmed' : formData.status,
        assignedTo: formData.assignedTo || currentUser.name,
        assignedToId: formData.assignedToId || currentUser.id,
      });
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleCreateOrder = async (lead: Lead) => {
    try {
      if (!currentUser) return;
      setLoading(true);
      
      await dataService.handleOrderConfirmation(lead);
      
      toast.success(`Order created and stock adjusted successfully!`);
      setIsDetailOpen(false);
    } catch (e) {
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
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
  
  const handleBulkUpdate = async (status?: LeadStatus, agentId?: string, agentName?: string) => {
    if (selectedLeads.length === 0) return;
    try {
      setLoading(true);
      const updates: Partial<Lead> = {};
      if (status) updates.status = status;
      if (agentId) {
        updates.assignedToId = agentId;
        updates.assignedTo = agentName;
      }
      await dataService.bulkUpdateLeads(selectedLeads, updates);
      toast.success(`Bulk updated ${selectedLeads.length} leads`);
      setSelectedLeads([]);
    } catch (e) {
      toast.error('Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    // 1. Role & Access Filter
    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
    const isOwner = lead.assignedToId === currentUser?.id;
    if (!isAdmin && !isOwner) return false;

    // 2. Search Filter
    const matchesSearch = 
      (lead.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (lead.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (lead.phone || "").includes(searchTerm);
    if (!matchesSearch) return false;

    // 3. Status Filter
    if (filters.status !== 'All' && lead.status !== filters.status) return false;

    // 4. Source Filter
    if (filters.source !== 'All' && lead.source !== filters.source) return false;

    // 5. Product Filter
    if (filters.product !== 'All' && lead.product !== filters.product) return false;

    // 6. Sales Rep Filter
    if (filters.salesRep !== 'All' && lead.assignedToId !== filters.salesRep) return false;

    // 7. Date Range (Simple implementation: Today/Yesterday/7 Days)
    if (filters.dateRange !== 'All') {
      const leadDate = new Date(lead.createdAt);
      const now = new Date();
      if (filters.dateRange === 'Today') {
        if (leadDate.toDateString() !== now.toDateString()) return false;
      } else if (filters.dateRange === 'Yesterday') {
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (leadDate.toDateString() !== yesterday.toDateString()) return false;
      } else if (filters.dateRange === '7 Days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        if (leadDate < sevenDaysAgo) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-slate-500">Track and manage your potential customers and sales pipeline.</p>
        </div>
        
        <div className="flex gap-2">
          <LeadAddDialog 
            open={isDialogOpen} 
            onOpenChange={setIsDialogOpen} 
            onAdd={handleAddLead} 
          />
          <Button onClick={() => setIsDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <UserPlus className="w-4 h-4" /> Add New Lead
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input 
            placeholder="Quick search..." 
            className="pl-9 border-slate-200 h-9 text-sm focus:ring-emerald-500/20 rounded-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <select 
            value={filters.status}
            onChange={e => setFilters({...filters, status: e.target.value})}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">All Status</option>
            <option value="New Lead">New Lead</option>
            <option value="Call Back">Call Back</option>
            <option value="No Answer">No Answer</option>
            <option value="Interested">Interested</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Order Confirmed">Order Confirmed</option>
            <option value="Fake/Spam">Fake/Spam</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Language Issue">Language Issue</option>
            <option value="RTO/Cancelled">RTO/Cancelled</option>
          </select>

          <select 
            value={filters.product}
            onChange={e => setFilters({...filters, product: e.target.value})}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">All Products</option>
            {inventory.map(item => (
              <option key={item.id} value={item.name}>{item.name}</option>
            ))}
          </select>

          <select 
            value={filters.dateRange}
            onChange={e => setFilters({...filters, dateRange: e.target.value})}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="7 Days">Last 7 Days</option>
          </select>

          {currentUser?.role === 'Admin' && (
            <select 
              value={filters.salesRep}
              onChange={e => setFilters({...filters, salesRep: e.target.value})}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="All">All Agents</option>
              {team.filter(t => t.role === 'Sales').map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 text-xs text-slate-400 hover:text-red-500"
            onClick={() => setFilters({ status: 'All', source: 'All', product: 'All', salesRep: 'All', dateRange: 'All' })}
          >
            Reset
          </Button>
        </div>
      </div>

      {selectedLeads.length > 0 && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-white/10 min-w-[500px]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-black">
              {selectedLeads.length}
            </div>
            <span className="text-sm font-bold">Leads Selected</span>
          </div>

          <div className="h-8 w-px bg-white/10 mx-2" />

          <div className="flex items-center gap-2 flex-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Bulk Actions:</span>
            
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white gap-2 border border-white/5 text-[10px] font-black uppercase tracking-widest">
                    <UserPlus className="w-3.5 h-3.5" /> Assign To Agent
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 bg-white">
                  <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 p-2">Select Sales Agent</DropdownMenuLabel>
                  <div className="max-h-[300px] overflow-y-auto">
                    {team.filter(t => t.role === 'Sales' && t.status === 'active').map(agent => (
                      <DropdownMenuItem 
                        key={agent.id} 
                        onSelect={() => handleBulkUpdate(undefined, agent.id, agent.name)}
                        className="flex items-center gap-2 p-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                          {agent.name[0]}
                        </div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white gap-2 border border-white/5 text-[10px] font-black uppercase tracking-widest">
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1 bg-white">
                {['Call Back', 'No Answer', 'Interested', 'Not Interested', 'Fake/Spam', 'Unavailable'].map(s => (
                  <DropdownMenuItem key={s} onSelect={() => handleBulkUpdate(s as LeadStatus)}>
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest"
            onClick={() => setSelectedLeads([])}
          >
            Cancel
          </Button>
        </motion.div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Processing leads...</p>
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
              <TableRow className="h-10 hover:bg-transparent">
                <TableHead className="w-12 px-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300"
                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedLeads(filteredLeads.map(l => l.id));
                      else setSelectedLeads([]);
                    }}
                  />
                </TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Lead Info</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Value</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Assigned</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 text-right">Added On</TableHead>
                <TableHead className="w-10 px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className={cn(
                    "group h-12 transition-colors cursor-pointer",
                    selectedLeads.includes(lead.id) ? "bg-emerald-50/40" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => {
                    setSelectedLead(lead);
                    setIsDetailOpen(true);
                  }}
                >
                  <TableCell className="px-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedLeads([...selectedLeads, lead.id]);
                        else setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                      }}
                    />
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{lead.name}</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 font-medium tracking-tight">
                        <span className="flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> {lead.phone}</span>
                        {lead.email && (
                          <>
                            <span className="opacity-30">•</span>
                            <span className="flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {lead.email}</span>
                          </>
                        )}
                        <span className="opacity-30">•</span>
                        <span>{lead.city || 'No City'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-black uppercase tracking-widest h-5 px-2 border-2 w-fit",
                        statusColors[lead.status]
                      )}>
                        {lead.status}
                      </Badge>
                      {lead.status === 'Call Back' && lead.callbackTime && (
                        <div className="flex items-center gap-1 text-[9px] font-bold text-purple-600 animate-pulse">
                          <Calendar className="w-2 h-2" />
                          {new Date(lead.callbackTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700 leading-none">₹{lead.value.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                          {lead.paymentMode} • {lead.quantity} Unit
                        </span>
                      </div>
                      <a 
                        href={`tel:${lead.phone}`} 
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                        title="Call Customer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500 uppercase">
                        {(lead.assignedTo || 'U')[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-600">{lead.assignedTo || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 text-right">
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors cursor-pointer outline-none">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 z-[100]">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Update Status</DropdownMenuLabel>
                        {['Call Back', 'No Answer', 'Interested', 'Order Confirmed', 'RTO/Cancelled'].map(s => (
                          <DropdownMenuItem key={s} onSelect={() => handleUpdateStatus(lead.id, s as LeadStatus)}>
                            {s}
                          </DropdownMenuItem>
                        ))}
                        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assign To</DropdownMenuLabel>
                            <div className="max-h-[200px] overflow-y-auto">
                              {team.filter(t => t.id !== lead.assignedToId).map(agent => (
                                <DropdownMenuItem key={agent.id} onSelect={() => handleAssign(lead.id, agent)}>
                                  {agent.name}
                                </DropdownMenuItem>
                              ))}
                            </div>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDelete(lead.id)} className="text-red-500 hover:text-red-600">
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

    <LeadDetailDialog 
      leadId={selectedLead?.id || null} 
      open={isDetailOpen} 
      onOpenChange={setIsDetailOpen} 
      onDelete={handleDelete}
    />

    {/* Callback Scheduler Dialog */}
    <Dialog open={callbackDialogOpen} onOpenChange={setCallbackDialogOpen}>
      <DialogContent className="sm:max-w-[400px] rounded-2xl bg-white border-none shadow-2xl p-6 z-[120]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-600" /> Schedule Call Back
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Date & Time</label>
            <Input 
              type="datetime-local" 
              className="h-12 rounded-xl border-slate-200 font-bold focus:ring-purple-500/20"
              value={tempCallbackTime}
              onChange={(e) => setTempCallbackTime(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
            A task will be automatically created and you'll be reminded to call this customer at the scheduled time.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="ghost" className="h-10 text-xs font-bold uppercase tracking-widest text-slate-400" onClick={() => setCallbackDialogOpen(false)}>Cancel</Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 h-10 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 px-8" 
            onClick={submitCallback}
            disabled={!tempCallbackTime}
          >
            Schedule Callback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  );
}
