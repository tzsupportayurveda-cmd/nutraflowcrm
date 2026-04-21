
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
  ChevronDown
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
  'Wrong Number': 'bg-slate-200 text-slate-700 hover:bg-slate-200',
  'Rejected': 'bg-red-100 text-red-700 hover:bg-red-100',
};

export function LeadManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
    package: '',
    value: 0,
    source: 'Direct',
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

  const handleUpdateStatus = async (leadId: string, status: LeadStatus, extras: Partial<Lead> = {}) => {
    try {
      await dataService.updateLead(leadId, { status, ...extras });
      toast.success(`Status updated to ${status}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const handleAssign = async (leadId: string, agent: User) => {
    try {
      await dataService.updateLead(leadId, { 
        assignedTo: agent.name, 
        assignedToId: agent.id 
      });
      toast.success(`Assigned to ${agent.name}`);
    } catch (e) {
      toast.error('Assignment failed');
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      await dataService.addLead({
        ...newLead,
        assignedTo: currentUser.name,
        assignedToId: currentUser.id,
      });
      toast.success('Lead added successfully!');
      setIsDialogOpen(false);
      setNewLead({ 
        name: '', 
        email: '', 
        phone: '', 
        address: '', 
        city: '', 
        pincode: '', 
        package: '', 
        value: 0, 
        source: 'Direct', 
        status: 'New' 
      });
    } catch (error) {
      toast.error('Failed to add lead');
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
  
  const filteredLeads = leads.filter(lead => 
    (lead.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (lead.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (lead.phone || "").includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Lead Management</h1>
          <p className="text-slate-500">Track and manage your potential customers and sales pipeline.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
              <UserPlus className="w-4 h-4" /> Add New Lead
            </Button>
          } />
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
                  <label className="text-sm font-bold text-slate-600">Package</label>
                  <Input 
                    placeholder="Starter Pack..." 
                    value={newLead.package}
                    onChange={e => setNewLead({...newLead, package: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600">Lead Value ($)</label>
                  <Input 
                    type="number"
                    value={newLead.value}
                    onChange={e => setNewLead({...newLead, value: Number(e.target.value)})}
                    className="border-slate-200"
                  />
                </div>
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
                  <Badge variant="secondary" className={cn(statusColors[lead.status])}>
                    {lead.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-slate-700">
                  ${lead.value.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {lead.source}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {lead.assignedTo}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-48 bg-white z-[100] shadow-xl border-slate-200">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => { setSelectedLead(lead); setIsDetailOpen(true); }}>
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>Edit Lead</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-emerald-600">Convert to Order</DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(lead.id)}
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
    <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-0 overflow-hidden">
        {selectedLead && (
          <div className="flex flex-col h-full max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <Badge className={cn(statusColors[selectedLead.status] || 'bg-slate-100 text-slate-700', "border-transparent")}>
                  {selectedLead.status}
                </Badge>
                <span className="text-xs text-slate-500">Source: {selectedLead.source || 'Unknown'}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{selectedLead.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedLead.email || 'No email'}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedLead.phone || 'No phone'}</span>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned To</label>
                  {currentUser?.role === 'Admin' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="outline" className="w-full justify-between font-medium h-10 border-slate-200">
                          {selectedLead.assignedTo || "Unassigned"} <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      } />
                      <DropdownMenuContent className="w-56" align="start">
                        <DropdownMenuLabel>Select Agent</DropdownMenuLabel>
                        {team.map(member => (
                          <DropdownMenuItem key={member.id} onClick={(e) => { e.stopPropagation(); handleAssign(selectedLead.id, member); }}>
                            {member.name} ({member.role})
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium">
                      {selectedLead.assignedTo || "Unassigned"}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Package</label>
                  <Input 
                    placeholder="e.g. Starter Pack" 
                    defaultValue={selectedLead.package}
                    className="h-10 border-slate-200"
                    onBlur={(e) => dataService.updateLead(selectedLead.id, { package: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Delivery Address</label>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Street Address</span>
                    <Input 
                      placeholder="House No, Street..." 
                      defaultValue={selectedLead.address}
                      className="h-9 border-slate-200"
                      onBlur={(e) => dataService.updateLead(selectedLead.id, { address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">City</span>
                      <Input 
                        placeholder="City" 
                        defaultValue={selectedLead.city}
                        className="h-9 border-slate-200"
                        onBlur={(e) => dataService.updateLead(selectedLead.id, { city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400">Pincode</span>
                      <Input 
                        placeholder="Pincode" 
                        defaultValue={selectedLead.pincode}
                        className="h-9 border-slate-200"
                        onBlur={(e) => dataService.updateLead(selectedLead.id, { pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Call Status</label>
                <div className="flex flex-wrap gap-2">
                  {(['No Answer', 'Call Back', 'Interested', 'Confirmed', 'Wrong Number', 'Rejected'] as LeadStatus[]).map(status => (
                    <Button 
                      key={status}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "px-4 h-9 rounded-full text-xs font-bold transition-all border-slate-200",
                        selectedLead.status === status && "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (status === 'Call Back') {
                          const time = prompt('Enter callback time (e.g. 5:00 PM today)');
                          if (time) handleUpdateStatus(selectedLead.id, status, { callbackTime: time });
                        } else {
                          handleUpdateStatus(selectedLead.id, status);
                        }
                      }}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interaction Log</label>
                <textarea 
                  className="w-full h-32 p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none transition-all"
                  placeholder="Describe the conversation..."
                  defaultValue={selectedLead.notes}
                  onBlur={(e) => dataService.updateLead(selectedLead.id, { notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
              <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="rounded-xl">Close Details</Button>
              {selectedLead.status === 'Confirmed' && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-10 shadow-lg shadow-emerald-500/20">
                  Create Dispatch Order
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </div>
  );
}
