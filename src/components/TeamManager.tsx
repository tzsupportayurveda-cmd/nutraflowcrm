
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock,
  MoreVertical,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
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
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { dataService } from '@/src/services/dataService';
import { User } from '@/src/types';
import { useAuth } from '@/src/contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TeamManager() {
  const { impersonate, isImpersonating, user: activeUser, adminUser } = useAuth();
  const [team, setTeam] = useState<User[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});
  const [confirmedCounts, setConfirmedCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUser) return;
    const isSuperAdmin = activeUser.role === 'SuperAdmin' || activeUser.email === 'tzsupportayurveda@gmail.com';
    if (!activeUser.orgId && !isSuperAdmin) return;

    // 1. Live presence subscription
    const unsubPresence = dataService.subscribeUsersPresence(activeUser, (users) => {
      setTeam(users);
      setLoading(false);
    });

    // 2. Fetch leads to count assignments and confirmed orders
    const unsubLeads = dataService.subscribeLeads(activeUser, (leads) => {
      const counts: Record<string, number> = {};
      const confirmed: Record<string, number> = {};
      leads.forEach(lead => {
        if (lead.assignedToId) {
          counts[lead.assignedToId] = (counts[lead.assignedToId] || 0) + 1;
          if (lead.status === 'Order Confirmed' || lead.status === 'Dispatched' || lead.status === 'Delivered') {
            confirmed[lead.assignedToId] = (confirmed[lead.assignedToId] || 0) + 1;
          }
        }
      });
      setLeadCounts(counts);
      setConfirmedCounts(confirmed);
    });

    return () => {
      unsubPresence();
      unsubLeads();
    };
  }, [activeUser]);

  const handleToggleStatus = async (uid: string, currentStatus: string) => {
    try {
      await dataService.toggleUserStatus(uid, currentStatus);
      toast.success(`User status updated to ${currentStatus === 'active' ? 'Pending' : 'Active'}`);
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm("Are you sure you want to REJECT and PERMANENTLY DELETE this user? They will be logged out immediately.")) {
      try {
        await dataService.deleteUser(uid);
        toast.success("User rejected and deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Human Resources</h1>
            <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[9px] uppercase tracking-widest px-2.5">
              Access Control
            </Badge>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-tight">Personnel roster management and authoritative authentication logs.</p>
        </div>
        
        {isImpersonating && (
          <Button 
            variant="destructive" 
            onClick={() => impersonate(null)}
            className="neo-shadow rounded-xl px-6 font-black uppercase text-[10px] tracking-widest bg-red-600 hover:bg-red-700 h-10"
          >
            Terminal Reset: Exit Impersonation
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-slate-300 transition-colors">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-slate-600 transition-colors">Staff Census</p>
          <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{team.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Verified Members</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-amber-200 transition-colors">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-amber-600 transition-colors">Security Clearance</p>
          <p className="text-3xl font-black text-amber-600 font-mono tracking-tighter">{team.filter(u => u.status !== 'active').length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Awaiting Approval</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-blue-200 transition-colors">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover:text-blue-600 transition-colors">Assignment Volume</p>
          <p className="text-3xl font-black text-blue-600 font-mono tracking-tighter">{Object.values(leadCounts).reduce((a: number, b: number) => a + b, 0)}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Total Managed Entities</p>
        </div>
        <div className="p-6 bg-slate-900 rounded-2xl shadow-2xl shadow-slate-900/20 text-white flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Security Protocol</p>
          </div>
          <p className="text-[10px] font-black leading-relaxed text-slate-400 uppercase tracking-tight">Zero-Trust Network Active. All agent authentications require explicit administrative authorization.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden neo-shadow min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 gap-4">
             <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Personnel Database...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-14 hover:bg-transparent border-b-slate-100">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-6">Administrative Identity</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Authorization</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Entity Load</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Performance</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Authorization Logs</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Comm Channel</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-6">Administrative Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id} className="h-20 hover:bg-slate-50/30 group transition-all border-b-slate-50">
                  <TableCell className="px-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} 
                          alt="" 
                          className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                          member.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{member.name}</span>
                          {member.isOnline && (
                            <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-1 rounded-sm ring-1 ring-emerald-100">Online Now</span>
                          )}
                        </div>
                        {member.id !== adminUser?.id ? (
                          <div className="mt-1.5 w-fit">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1.5 uppercase tracking-[0.1em] hover:bg-indigo-600 hover:text-white transition-all cursor-pointer outline-none">
                                {member.role} <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40 p-2 rounded-xl shadow-2xl border-slate-100">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1">Change Clearance</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-slate-50" />
                                {(['Sales', 'Manager', 'Inventory', 'Marketer', 'Delivery', 'Admin', 'SuperAdmin'] as const).map(r => (
                                  <DropdownMenuItem 
                                    key={r}
                                    onClick={async () => {
                                      try {
                                        await dataService.updateUserRole(member.id, r);
                                        toast.success(`Role updated: ${member.name} is now ${r}`);
                                      } catch (err) {
                                        toast.error(`Failed to update role for ${member.name}`);
                                      }
                                    }}
                                    className={cn(
                                      "rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors",
                                      member.role === r ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    <ShieldCheck className={cn("w-3.5 h-3.5 mr-2", member.role === r ? "text-indigo-500" : "text-slate-300")} />
                                    {r}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-black text-emerald-600 bg-emerald-50/50 border-emerald-100 px-2 py-1 rounded-lg w-fit mt-1.5 uppercase tracking-widest ring-1 ring-emerald-100/50">SYSTEM_ROOT {member.role}</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge 
                      className={cn(
                        "rounded-xl px-3 py-1 font-black text-[9px] uppercase tracking-[0.2em] shadow-sm transform transition-transform group-hover:scale-105",
                        member.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border-2 border-amber-100"
                      )}
                    >
                      {member.status === 'active' ? 'Authorized' : 'Restricted'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{leadCounts[member.id] || 0}</span>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Assignments</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-emerald-600 font-mono tracking-tighter">{confirmedCounts[member.id] || 0}</span>
                      <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest mt-1">Confirmed</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col gap-1.5 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">
                          {member.lastLogin ? new Date(member.lastLogin).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() : 'NEVER_LOGGED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-1.5 py-0.5 bg-slate-100 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                          {member.lastDevice || 'Desktop'}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 truncate max-w-[100px]" title={member.lastBrowser}>
                          {member.lastBrowser || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-slate-600">
                    <div className="flex items-center gap-2.5 group/mail">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center group-hover/mail:bg-indigo-50 transition-colors">
                        <Mail className="w-4 h-4 text-slate-300 group-hover/mail:text-indigo-400 transition-colors" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-tight text-slate-500 group-hover/mail:text-indigo-600 transition-colors">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      {member.id !== adminUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => impersonate(member)}
                          className="h-10 px-4 gap-2 font-black text-[10px] uppercase tracking-widest text-indigo-600 hover:text-white hover:bg-slate-900 rounded-xl border border-transparent hover:border-slate-800 transition-all shadow-md"
                        >
                          <Users className="w-3.5 h-3.5" /> Initialize Terminal
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                          "h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                          member.status === 'active' 
                            ? "hover:bg-amber-50 hover:text-amber-600 bg-white text-slate-900 border-2 border-slate-100" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700 border-none shadow-xl shadow-emerald-500/20"
                        )}
                        onClick={() => handleToggleStatus(member.id, member.status)}
                        disabled={member.email === 'tzsupportayurveda@gmail.com'}
                      >
                        {member.status === 'active' ? 'Revoke' : 'Provision'}
                      </Button>

                      {member.id !== adminUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                          onClick={() => handleDeleteUser(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
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
