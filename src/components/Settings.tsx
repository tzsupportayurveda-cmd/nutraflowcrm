
import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Users, 
  Bell, 
  Database, 
  Globe,
  Save,
  CheckCircle2,
  Lock,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function Settings() {
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Settings updated successfully!');
    }, 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-slate-500">Configure your CRM workspace, roles, and automated workflows.</p>
      </div>

      <div className="grid gap-6">
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold">General Configuration</h3>
              <p className="text-xs text-slate-500">Workspace name and regional settings.</p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Company Name</label>
              <Input placeholder="NutraFlow Lab Inc." defaultValue="NutraFlow CRM" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Support Email</label>
              <Input placeholder="support@example.com" defaultValue="tzsupportayurveda@gmail.com" />
            </div>
          </div>
        </section>

        <section className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 text-slate-900 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Shield className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold">Access Control (RBAC)</h3>
              <p className="text-xs text-slate-500">Define what agents can do by default.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 tracking-tight">Restrict Lead Visibility</p>
                <p className="text-xs text-slate-500">Agents can only see leads assigned specifically to them.</p>
              </div>
              <Switch checked={true} />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 tracking-tight">Allow Manual Deletion</p>
                <p className="text-xs text-slate-500">Allow Sales role to delete leads from their dashboard.</p>
              </div>
              <Switch checked={false} />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 tracking-tight">Force Address Verification</p>
                <p className="text-xs text-slate-500">Leads must have notes before being marked as 'Confirmed'.</p>
              </div>
              <Switch checked={true} />
            </div>
          </div>
        </section>

        <section className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 text-slate-900 mb-6">
             <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Database className="w-5 h-5" /></div>
             <div>
                <h3 className="font-bold">Lead Automation</h3>
                <p className="text-xs text-slate-500">Control how website leads land in your inbox.</p>
             </div>
          </div>
          
          <div className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto relative group">
             <Button variant="ghost" size="xs" className="absolute top-2 right-2 text-emerald-400 hover:text-emerald-300 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                Copy Webhook
             </Button>
             <code>
               POST /api/webhook/lead<br />
               Content-Type: application/json<br />
               Authorization: Bearer [SYSTEM_KEY]
             </code>
          </div>
        </section>
      </div>

      <div className="flex justify-end pt-4 pb-10">
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-14 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-500/20 gap-3"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Apply All Changes
        </Button>
      </div>
    </div>
  );
}
