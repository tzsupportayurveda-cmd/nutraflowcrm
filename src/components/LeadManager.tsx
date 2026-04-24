
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
      setLeads(data);
      setLoading(false);
    });

    dataService.getInventoryList().then(setInventory);

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
            description: `Auto-generated callback task for lead ${currentLead.serialId || leadId}`,
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
        assignedTo: currentUser.name,
        assignedToId: currentUser.id,
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
          className="flex items-center gap-4 p-3 bg-emerald-600 text-white rounded-xl shadow-lg"
        >
          <span className="text-sm font-bold ml-2">{selectedLeads.length} Leads Selected</span>
          <div className="h-6 w-px bg-white/20 mx-2" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase opacity-80">Change Status:</span>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {['Call Back', 'No Answer', 'Interested', 'Not Interested', 'Fake/Spam', 'Unavailable'].map(s => (
                <button 
                  key={s}
                  onClick={() => handleBulkUpdate(s as LeadStatus)}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {currentUser?.role === 'Admin' && (
            <>
              <div className="h-6 w-px bg-white/20 mx-2" />
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase inline-flex items-center transition-colors outline-none">
                  Assign To
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-white z-[100]">
                  {team.filter(t => t.role === 'Sales').map(agent => (
                    <DropdownMenuItem key={agent.id} onSelect={() => handleBulkUpdate(undefined, agent.id, agent.name)}>
                      {agent.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button 
            variant="ghost" 
            className="ml-auto h-8 text-white/70 hover:text-white"
            onClick={() => setSelectedLeads([])}
          >
            Deselect
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
                    <Badge variant="outline" className={cn(
                      "text-[9px] font-black uppercase tracking-widest h-5 px-2 border-2",
                      statusColors[lead.status]
                    )}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 leading-none">₹{lead.value.toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {lead.paymentMode} • {lead.quantity} Unit
                      </span>
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
      <DialogContent className="sm:max-w-[1000px] rounded-2xl p-0 overflow-hidden bg-white">
        {editableLead && (
          <div className="flex h-[85vh] overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100">
              <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2", statusColors[editableLead.status])}>
                    {editableLead.status}
                  </Badge>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {editableLead.serialId}</span>
                </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)} className="h-8 text-xs font-bold text-slate-500">Close</Button>
                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(editableLead.id)} 
                        className="h-8 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete Lead
                      </Button>
                    )}
                    {hasChanges && (
                      <Button onClick={handleSaveChanges} size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 shadow-sm">
                        Save All Changes
                      </Button>
                    )}
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Header Info */}
                <div className="space-y-4">
                  <Input 
                    value={editableLead.name}
                    onChange={(e) => {
                      setEditableLead({ ...editableLead, name: e.target.value });
                      setHasChanges(true);
                    }}
                    className="text-3xl font-black bg-transparent border-none p-0 h-auto focus-visible:ring-0 shadow-none placeholder:text-slate-200"
                    placeholder="Customer Name"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <Input 
                          value={editableLead.phone} 
                          onChange={e => { setEditableLead({...editableLead, phone: e.target.value}); setHasChanges(true); }} 
                          className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-bold h-full"
                          onCopy={(e) => {
                            if (currentUser?.role === 'Sales') {
                              e.preventDefault();
                              toast.warning('Copy feature disabled for Sales team');
                            }
                          }}
                          onContextMenu={(e) => {
                            if (currentUser?.role === 'Sales') {
                              e.preventDefault();
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        <Input 
                          value={editableLead.email || ''} 
                          onChange={e => { setEditableLead({...editableLead, email: e.target.value}); setHasChanges(true); }} 
                          className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-bold h-full"
                          placeholder="No email provided"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Address</label>
                    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-1" />
                      <textarea 
                        value={editableLead.address || ''} 
                        onChange={e => { setEditableLead({...editableLead, address: e.target.value}); setHasChanges(true); }} 
                        className="w-full bg-transparent border-none shadow-none focus:ring-0 text-sm font-bold min-h-[60px] resize-none outline-none"
                        placeholder="No address provided"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">City</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <Input value={editableLead.city || ''} onChange={e => { setEditableLead({...editableLead, city: e.target.value}); setHasChanges(true); }} className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-bold h-full" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pincode</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
                        <MapPin className="w-3.5 h-3.5 text-purple-500" />
                        <Input value={editableLead.pincode || ''} onChange={e => { setEditableLead({...editableLead, pincode: e.target.value}); setHasChanges(true); }} className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-bold h-full" placeholder="Ex: 400001" />
                      </div>
                    </div>
                  </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Package / Product</label>
                      <select 
                        value={editableLead.product || ''}
                        onChange={e => {
                          const prodName = e.target.value;
                          const item = inventory.find(i => i.name === prodName);
                          setEditableLead({
                            ...editableLead, 
                            product: prodName,
                            value: item ? item.price * (editableLead.quantity || 1) : editableLead.value
                          });
                          setHasChanges(true);
                        }}
                        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/10"
                      >
                        {inventory.map(item => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                </div>

                {hasChanges && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-emerald-900 uppercase">Unsaved Changes</span>
                      <span className="text-[10px] text-emerald-600 font-bold">You have modified lead data</span>
                    </div>
                    <Button 
                      onClick={handleSaveChanges} 
                      className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl"
                    >
                      Save Profile
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Pipeline Status</label>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Button 
                        onClick={() => setStatusOpen(!statusOpen)}
                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white gap-2 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg"
                      >
                        <CheckCircle className="w-4 h-4" /> Change Status
                        <ChevronDown className={cn("w-4 h-4 ml-auto opacity-50 transition-transform", statusOpen && "rotate-180")} />
                      </Button>
                      
                      {statusOpen && (
                        <>
                          <div className="fixed inset-0 z-[1100]" onClick={() => setStatusOpen(false)} />
                          <div className="absolute bottom-full left-0 mb-2 w-[300px] p-2 bg-white z-[1200] rounded-xl shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2 border-bottom border-slate-50">Select New Status</div>
                            <div className="py-1">
                              {[
                                'Call Back', 
                                'No Answer', 
                                'Interested', 
                                'Not Interested', 
                                'Fake/Spam', 
                                'Unavailable', 
                                'Language Issue',
                                'Order Confirmed',
                                'RTO/Cancelled'
                              ].map(s => (
                                <button 
                                  key={s} 
                                  onClick={() => {
                                    handleUpdateStatus(editableLead.id, s as LeadStatus);
                                    setStatusOpen(false);
                                  }}
                                  className="w-full flex items-center h-10 px-3 cursor-pointer rounded-lg hover:bg-slate-50 font-bold text-sm text-slate-700 transition-colors"
                                >
                                  <div className={cn("mr-3 h-2 w-2 rounded-full", statusColors[s as LeadStatus]?.split(' ')[0])} />
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {editableLead.status === 'Call Back' && editableLead.callbackTime && (
                      <div className="flex flex-col items-center p-2 bg-purple-50 border border-purple-100 rounded-xl">
                        <span className="text-[9px] font-black text-purple-400 uppercase tracking-tighter leading-none mb-1">Scheduled Callback</span>
                        <span className="text-xs font-black text-purple-700">{new Date(editableLead.callbackTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Entry Section (Clean & Functional) */}
                <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-emerald-900 uppercase tracking-widest">Order Entry</h3>
                    <Badge className="bg-emerald-200 text-emerald-800 border-none font-black text-[9px] uppercase">Direct Sale</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700/60 uppercase">Package</label>
                      <select 
                        value={editableLead.product || ''}
                        onChange={e => {
                          const prodName = e.target.value;
                          const item = inventory.find(i => i.name === prodName);
                          setEditableLead({
                            ...editableLead, 
                            product: prodName,
                            value: item ? item.price * (editableLead.quantity || 1) : editableLead.value
                          });
                          setHasChanges(true);
                        }}
                        className="w-full h-10 bg-white border border-emerald-100 rounded-xl px-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {inventory.map(item => (
                          <option key={item.id} value={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-700/60 uppercase">Quantity</label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={editableLead.quantity || 1} 
                        onChange={e => {
                          const qty = parseInt(e.target.value) || 1;
                          const item = inventory.find(i => i.name === editableLead.product);
                          const price = item ? item.price : (editableLead.value / (editableLead.quantity || 1));
                          setEditableLead({...editableLead, quantity: qty, value: price * qty});
                          setHasChanges(true);
                        }}
                        className="h-10 bg-white border-emerald-100 rounded-xl font-bold" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-emerald-700/60 uppercase">Order Value</span>
                      <span className="text-xl font-black text-emerald-600">₹{(editableLead.value || 0).toLocaleString()}</span>
                    </div>
                    <Button 
                      onClick={() => handleCreateOrder(editableLead)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest px-6 shadow-lg shadow-emerald-500/20 h-10"
                    >
                      Confirm Order
                    </Button>
                  </div>
                </div>

                {/* Notes & Call Logs */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent Notes & Call Logs</label>
                  <textarea 
                    value={editableLead.notes || ''}
                    onChange={e => { setEditableLead({...editableLead, notes: e.target.value}); setHasChanges(true); }}
                    className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-slate-100 outline-none transition-all placeholder:text-slate-300"
                    placeholder="Add detailed call logs or customer requirements here..."
                  />
                </div>
              </div>
            </div>

            {/* Sidebar: Customer History */}
            <div className="w-80 flex flex-col bg-slate-50/50">
              <div className="p-4 border-b border-slate-100 bg-emerald-900 text-white rounded-tr-2xl">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Customer Lifetime Value</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black">₹{(editableLead.ltv || 0).toLocaleString()}</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> Interaction History
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Previous Orders */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Orders</span>
                  {customerHistory.orders.length === 0 ? (
                    <div className="p-4 bg-white/50 border border-dashed border-slate-200 rounded-xl text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">No previous orders</p>
                    </div>
                  ) : (
                    customerHistory.orders.map(order => (
                      <div key={order.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-900">ORD-{order.orderSerial}</span>
                          <Badge className="text-[8px] h-3.5 px-1 bg-emerald-100 text-emerald-700 border-none font-bold uppercase">{order.status}</Badge>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">₹{order.total.toLocaleString()} • {order.paymentMode}</p>
                        <p className="text-[10px] text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Audit Log / History Items */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Track</span>
                  <div className="space-y-4">
                    {(editableLead.history || []).slice().reverse().map((item, idx) => (
                      <div key={item.id || idx} className="relative pl-4 border-l-2 border-slate-200 py-1">
                        <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-slate-300" />
                        <p className="text-[10px] font-black text-slate-700 leading-tight">
                          {item.type === 'status_change' ? `Status: ${item.from} → ${item.to}` : 
                           item.type === 'assignment' ? `Assigned to ${item.to}` : 
                           item.type === 'note_added' ? 'Note Added' : 'System Update'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">By {item.updatedBy}</span>
                          <span className="text-[8px] text-slate-300">•</span>
                          <span className="text-[9px] font-medium text-slate-400">{new Date(item.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                        </div>
                        {item.note && <p className="text-[10px] text-slate-500 mt-1 italic italic">"{item.note}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

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
