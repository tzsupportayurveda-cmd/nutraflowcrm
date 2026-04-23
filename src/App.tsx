import React, { useState } from 'react';
import { Sidebar } from '@/src/components/Sidebar';
import { Dashboard } from '@/src/components/Dashboard';
import { LeadManager } from '@/src/components/LeadManager';
import { InventoryManager } from '@/src/components/InventoryManager';
import { OrderManager } from '@/src/components/OrderManager';
import { TeamManager } from '@/src/components/TeamManager';
import { ConfirmedLeads } from '@/src/components/ConfirmedLeads';
import { Settings } from '@/src/components/Settings';
import { AffiliateManager } from '@/src/components/AffiliateManager';
import { DeliveryPortal } from '@/src/components/DeliveryPortal';
import { LandingPage } from '@/src/components/LandingPage';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Search, 
  HelpCircle,
  User as UserIcon,
  ChevronDown,
  Loader2,
  LogOut
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/sonner';
import { BrandLogo } from '@/src/components/BrandLogo';

function CRMApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, loading, impersonate, isImpersonating } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-6">
        <div className="relative">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-black/50 animate-pulse relative z-10">
            <BrandLogo className="w-10 h-10" />
          </div>
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl animate-pulse"></div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Initializing Workspace</p>
        </div>
      </div>
    );
  }

  if (!user || (user.status !== 'active' && user.role !== 'Admin')) {
    return <LandingPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'leads': return <LeadManager />;
      case 'confirmed': return <ConfirmedLeads />;
      case 'inventory': return <InventoryManager />;
      case 'orders': return <OrderManager />;
      case 'delivery': return <DeliveryPortal />;
      case 'team': return <TeamManager />;
      case 'affiliate': return <AffiliateManager />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        {isImpersonating && (
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 text-sm font-bold">
              <UserIcon className="w-4 h-4" />
              <span>LOGGED IN AS AGENT: {user?.name} (Audit Mode)</span>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => impersonate(null)}
              className="h-7 text-[10px] font-black uppercase tracking-widest bg-white text-blue-600 hover:bg-white/90"
            >
              Exit Audit
            </Button>
          </div>
        )}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm shadow-slate-100">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search leads, products, orders..." 
                className="pl-10 h-10 border-slate-200 bg-slate-50/50 focus-visible:bg-white transition-all ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-500 relative hover:bg-slate-50">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:bg-slate-50">
              <HelpCircle className="w-5 h-5" />
            </Button>
            
            <div className="w-px h-6 bg-slate-200 mx-2"></div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="pl-1 pr-2 h-11 gap-3 hover:bg-slate-50 rounded-lg border-transparent">
                    <Avatar className="h-8 w-8 border border-slate-200 shadow-sm ring-2 ring-emerald-500/10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start leading-none">
                      <span className="text-sm font-bold text-slate-900">{user.name}</span>
                      <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">{user.role}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-64 p-3 rounded-2xl border-slate-200 shadow-xl bg-white z-[100]">
                <div className="px-3 py-3 mb-2 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 truncate">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent text-[9px] font-black uppercase tracking-tighter shadow-none">
                      {user.role}
                    </Badge>
                    <span className="text-[10px] font-mono text-slate-400 py-0.5 px-1 bg-white border border-slate-100 rounded">
                      ID: {user.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
                
                <DropdownMenuSeparator className="bg-slate-100 my-2" />
                
                <DropdownMenuItem 
                  className="rounded-xl h-10 px-3 cursor-pointer hover:bg-slate-50 gap-3 group transition-all"
                  onClick={() => setActiveTab('settings')}
                >
                  <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                  <span className="text-sm font-bold text-slate-700">Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="rounded-xl h-10 px-3 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer gap-3 group"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                  <span className="text-sm font-bold">Logout Session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      
      <Toaster position="top-right" />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CRMApp />
    </AuthProvider>
  );
}
