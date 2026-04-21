
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
  Clock
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
import { dataService } from '@/src/services/dataService';
import { User } from '@/src/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TeamManager() {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-slate-500">Enable or disable agent access and manage roles.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Approval Required</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Members</p>
          <p className="text-2xl font-bold text-slate-900">{team.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Waitlist</p>
          <p className="text-2xl font-bold text-amber-600">{team.filter(u => u.status !== 'active').length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 italic flex items-center justify-center col-span-2">
          <Lock className="w-4 h-4 mr-2" /> All new signups are 'Pending' until Admin approval.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Fetching team roster...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Access Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map((member) => (
                <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img 
                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`} 
                        alt="" 
                        className="w-10 h-10 rounded-full border border-slate-100 ring-2 ring-slate-50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{member.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{member.id.substring(0,8)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        "rounded-lg px-2 py-0.5",
                        member.status === 'active' 
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                          : "bg-amber-100 text-amber-700 border-amber-200"
                      )}
                    >
                      {member.status === 'active' ? 'Active' : 'Pending Approval'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-slate-600">
                      {member.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{member.email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={cn(
                        "h-8 gap-2 rounded-lg font-bold text-xs",
                        member.status === 'active' 
                          ? "hover:bg-amber-50 hover:text-amber-600 border-slate-200" 
                          : "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-sm"
                      )}
                      onClick={() => handleToggleStatus(member.id, member.status)}
                      disabled={member.email === 'tzsupportayurveda@gmail.com'}
                    >
                      {member.status === 'active' ? (
                        <>Disable Access</>
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Approve & Grant Access</>
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
