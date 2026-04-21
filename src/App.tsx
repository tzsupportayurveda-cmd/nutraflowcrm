import React, { useState } from 'react';
import { Sidebar } from '@/src/components/Sidebar';
import { Dashboard } from '@/src/components/Dashboard';
import { LeadManager } from '@/src/components/LeadManager';
import { InventoryManager } from '@/src/components/InventoryManager';
import { OrderManager } from '@/src/components/OrderManager';
import { TeamManager } from '@/src/components/TeamManager';
import { ConfirmedLeads } from '@/src/components/ConfirmedLeads';
import { Settings } from '@/src/components/Settings';
import { LandingPage } from '@/src/components/LandingPage';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Search, 
  HelpCircle,
  User as UserIcon,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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

function CRMApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-emerald-500 gap-4">
        <Loader2 className="w-12 h-12 animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Initializing NutraFlow...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'leads': return <LeadManager />;
      case 'confirmed': return <ConfirmedLeads />;
      case 'inventory': return <InventoryManager />;
      case 'orders': return <OrderManager />;
      case 'team': return <TeamManager />;
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
              <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl border-slate-200 shadow-xl">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 mx-1" />
                <DropdownMenuItem className="rounded-lg h-10 px-3 cursor-pointer">Profile Settings</DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg h-10 px-3 cursor-pointer">Company Config</DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 mx-1" />
                <DropdownMenuItem 
                  className="rounded-lg h-10 px-3 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={signOut}
                >
                  Logout Session
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
