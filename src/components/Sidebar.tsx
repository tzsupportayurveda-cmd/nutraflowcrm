
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

import { useAuth } from '@/src/contexts/AuthContext';
import { ShieldCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'All Leads', icon: Users },
  { id: 'confirmed', label: 'Confirmed Orders', icon: CheckCircle2 },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'orders', label: 'Dispatched', icon: ShoppingCart },
  { id: 'affiliate', label: 'Affiliates', icon: TrendingUp, adminOnly: true },
  { id: 'team', label: 'Admin & Team', icon: ShieldCheck, adminOnly: true },
  { id: 'settings', label: 'System Settings', icon: Settings, adminOnly: true },
];

export function Sidebar({ activeTab, setActiveTab, collapsed, setCollapsed }: SidebarProps) {
  const { signOut, user } = useAuth();
  
  const filteredNavItems = navItems.filter(item => !item.adminOnly || user?.role === 'Admin');

  return (
    <div className={cn(
      "flex flex-col h-screen bg-slate-950 text-white transition-all duration-300 ease-in-out border-r border-slate-800",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex items-center justify-between p-6 h-20">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-slate-900 rounded-xl shadow-lg shadow-black/20 group">
              <BrandLogo className="w-6 h-6 transition-transform group-hover:scale-110" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">TOZ Flow</span>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center w-full">
            <div className="p-1.5 bg-slate-900 rounded-xl group">
              <BrandLogo className="w-6 h-6 transition-transform group-hover:scale-110" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-1.5 custom-scrollbar overflow-y-auto">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold px-4 mb-4">
          {!collapsed ? "Global Navigation" : "Nav"}
        </div>
        {filteredNavItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-4 h-11 transition-all rounded-xl",
              activeTab === item.id 
                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 transition-all" 
                : "text-slate-400 hover:text-white hover:bg-white/5 border-transparent",
              collapsed && "justify-center px-0"
            )}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-semibold text-sm">{item.label}</span>}
          </Button>
        ))}
      </div>

      <div className="p-4 mt-auto space-y-2">
        <Separator className="bg-slate-800/50 mb-4" />
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-4 h-11 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl",
            collapsed && "justify-center px-0"
          )}
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </Button>
        
        <div className="pt-4 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl text-slate-500 hover:text-white bg-white/5 border border-white/5 hover:bg-white/10"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
