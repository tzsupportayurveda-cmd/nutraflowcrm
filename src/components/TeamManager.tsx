
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock,
  MoreVertical,
  Loader2,
  Trash2
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-slate-500">Control access roles and manage your laboratory staff.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-500/20">
          <UserPlus className="w-4 h-4" /> Invite Member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Members</p>
          <p className="text-2xl font-bold text-slate-900">{team.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Admins</p>
          <p className="text-2xl font-bold text-emerald-600">{team.filter(u => u.role === 'Admin').length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-400 italic flex items-center justify-center">
          <Lock className="w-4 h-4 mr-2" /> Role Based Access Active
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
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      <span className="font-bold text-slate-900">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{member.email}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={member.role === 'Admin' 
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                        : "bg-blue-100 text-blue-700 border-blue-200"}
                    >
                      {member.role === 'Admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-slate-400 uppercase">
                    {member.id ? member.id.substring(0, 8) : 'TEMP-ID'}...
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
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
