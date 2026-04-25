
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
  DropdownMenuLabel,
  DropdownMenuSeparator
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We'll use a direct snapshot for team members for now
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setTeam(members);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-slate-500">Enable or disable agent access, manage roles, and monitor login info.</p>
        </div>
        
        {isImpersonating && (
          <Button 
            variant="destructive" 
            onClick={() => impersonate(null)}
            className="rounded-full px-6 font-bold shadow-lg shadow-red-500/20"
          >
            Exit Impersonation
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Members</p>
          <p className="text-3xl font-black text-slate-900">{team.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Approval</p>
          <p className="text-3xl font-black text-amber-600">{team.filter(u => u.status !== 'active').length}</p>
        </div>
        <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/20 text-white flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Security Protocol</p>
          </div>
          <p className="text-xs font-bold leading-relaxed">Admin restricted access. All agents requires approval. Impersonation enabled for performance audit.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Fetching team roster...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b border-slate-100">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Agent Identity</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Login Reference (ID)</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Contact Profile</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-500 py-4">Administrative Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} 
                          alt="" 
                          className="w-12 h-12 rounded-2xl border border-slate-100 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                          member.status === 'active' ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{member.name}</span>
                        {member.id !== adminUser?.id ? (
                          <div className="mt-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider hover:bg-emerald-100 transition-colors cursor-pointer outline-none">
                                {member.role} <ChevronDown className="w-2.5 h-2.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-32 p-1">
                                {(['Sales', 'Manager', 'Inventory', 'Marketer', 'Admin'] as const).map(r => (
                                  <DropdownMenuItem 
                                    key={r}
                                    onClick={() => dataService.updateUserRole(member.id, r).then(() => toast.success(`Role updated to ${r}`))}
                                    className={cn("text-[10px] font-bold uppercase", member.role === r && "bg-emerald-50 text-emerald-600")}
                                  >
                                    {r}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-1 uppercase tracking-wider">{member.role}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        "rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-widest",
                        member.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      )}
                    >
                      {member.status === 'active' ? 'Authorized' : 'Restricted'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 group">
                      <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {member.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-300" />
                      <span className="text-sm font-medium">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      {member.id !== adminUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => impersonate(member)}
                          className="h-9 px-4 gap-2 font-black text-[10px] uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                        >
                          Login as Agent
                        </Button>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                          "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest",
                          member.status === 'active' 
                            ? "hover:bg-amber-50 hover:text-amber-600 border-slate-200" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-lg shadow-emerald-500/20"
                        )}
                        onClick={() => handleToggleStatus(member.id, member.status)}
                        disabled={member.email === 'tzsupportayurveda@gmail.com'}
                      >
                        {member.status === 'active' ? 'Disable' : 'Authorize'}
                      </Button>

                      {member.id !== adminUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50"
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
