
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  TrendingUp, 
  Package as PackageIcon, 
  DollarSign,
  Clock,
  Filter,
  Calendar,
  User as UserIcon,
  ChevronDown,
  Target,
  CheckCircle,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dataService } from '@/src/services/dataService';
import { useAuth } from '@/src/contexts/AuthContext';
import { Lead, Order, InventoryItem, User } from '@/src/types';
import { cn } from '@/lib/utils';
import { startOfDay, startOfMonth, isAfter, parseISO, format, isSameDay } from 'date-fns';

type DateFilter = 'today' | 'month' | 'all';

export function Dashboard() {
  const { user: currentUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');

  useEffect(() => {
    const unsubLeads = dataService.subscribeLeads(setLeads);
    const unsubOrders = dataService.subscribeOrders(setOrders);
    const unsubInv = dataService.subscribeInventory(setInventory);

    if (currentUser?.role === 'Admin') {
      dataService.getTeamMembers().then(setTeamMembers);
    }

    return () => {
      unsubLeads();
      unsubOrders();
      unsubInv();
    };
  }, [currentUser]);

  // Derived filtered data
  const filteredData = useMemo(() => {
    let resultLeads = [...leads];
    let resultOrders = [...orders];

    // 1. Role / Agent Filter
    if (currentUser?.role !== 'Admin') {
      // Agents only see their data
      resultLeads = resultLeads.filter(l => l.assignedToId === currentUser?.id);
      resultOrders = resultOrders.filter(o => o.agentId === currentUser?.id);
    } else if (selectedAgentId !== 'all') {
      // Admin viewing specific agent
      resultLeads = resultLeads.filter(l => l.assignedToId === selectedAgentId);
      resultOrders = resultOrders.filter(o => o.agentId === selectedAgentId);
    }

    // 2. Date Filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = startOfDay(now);
      resultLeads = resultLeads.filter(l => isSameDay(parseISO(l.createdAt), today));
      resultOrders = resultOrders.filter(o => isSameDay(parseISO(o.createdAt), today));
    } else if (dateFilter === 'month') {
      const monthStart = startOfMonth(now);
      resultLeads = resultLeads.filter(l => isAfter(parseISO(l.createdAt), monthStart));
      resultOrders = resultOrders.filter(o => isAfter(parseISO(o.createdAt), monthStart));
    }

    return { filteredLeads: resultLeads, filteredOrders: resultOrders };
  }, [leads, orders, dateFilter, selectedAgentId, currentUser]);

  const { filteredLeads, filteredOrders } = filteredData;

  const stats = {
    leads: filteredLeads.length,
    revenue: filteredOrders.reduce((acc, o) => acc + o.total, 0),
    confirmed: filteredLeads.filter(l => l.status === 'Confirmed').length,
    pending: filteredOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length
  };

  const selectedAgent = teamMembers.find(m => m.id === selectedAgentId);

  // Generate chart data based on filtered data
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthData = months.map(m => ({ name: m, leads: 0, revenue: 0 }));
    
    filteredLeads.forEach(l => {
      const monthIdx = parseISO(l.createdAt).getMonth();
      currentMonthData[monthIdx].leads++;
    });
    
    filteredOrders.forEach(o => {
      const monthIdx = parseISO(o.createdAt).getMonth();
      currentMonthData[monthIdx].revenue += o.total;
    });

    return currentMonthData.filter((_, i) => i <= new Date().getMonth());
  }, [filteredLeads, filteredOrders]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            {currentUser?.role === 'Admin' ? (selectedAgentId === 'all' ? 'Company Analytics' : `${selectedAgent?.name}'s Performance`) : 'My Sales Performance'}
          </h1>
          {currentUser?.role === 'Admin' && selectedAgentId !== 'all' && (
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded uppercase tracking-tighter">
                ACTIVE AGENT ID
              </span>
              <code className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {selectedAgentId}
              </code>
            </div>
          )}
          <p className="text-slate-500 font-medium">Monitoring business growth and agent productivity in real-time.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
          {currentUser?.role === 'Admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="h-10 px-4 gap-2 border-r border-slate-100 rounded-none first:rounded-l-xl">
                    <UserIcon className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold truncate max-w-[120px]">
                      {selectedAgentId === 'all' ? 'All Agents' : selectedAgent?.name}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-slate-400 font-black px-2 py-1.5">View Agent Performance</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedAgentId('all')} className="rounded-lg">All Company Data</DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map(member => (
                  <DropdownMenuItem 
                    key={member.id} 
                    onClick={() => setSelectedAgentId(member.id)}
                    className="rounded-lg gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{member.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {member.id.substring(0, 8)}...</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex p-1 bg-slate-50 rounded-xl">
            {(['today', 'month', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all",
                  dateFilter === filter 
                    ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Leads</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.leads}</div>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3" /> Fresh leads processed
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Total Revenue</CardTitle>
            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">₹{stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-2">
              <Target className="w-3 h-3" /> Sales conversion value
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Confirmed</CardTitle>
            <div className="p-2 bg-emerald-50 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.confirmed}</div>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2">
              Success rate tracking
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-amber-500/10 transition-all group">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Pending</CardTitle>
            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900">{stats.pending}</div>
            <p className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-2">
              Orders being processed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-lg font-black text-slate-900">Revenue Growth</CardTitle>
            <CardDescription className="font-medium">Company earnings over time based on confirmed orders.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50">
            <CardTitle className="text-lg font-black text-slate-900">Lead Conversion</CardTitle>
            <CardDescription className="font-medium">Total leads assigned vs processed.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts (Only for Admin/Inventory) */}
      {(currentUser?.role === 'Admin' || currentUser?.role === 'Inventory') && (
        <Card className="border-none shadow-xl shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-amber-500" />
              Inventory Pulse
            </CardTitle>
            <CardDescription className="font-medium">Items requiring attention due to low stock levels.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inventory.filter(i => i.stock <= i.minStock).slice(0, 3).map(item => (
                <div key={item.id} className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-amber-900">{item.name}</p>
                    <p className="text-xs text-amber-700 font-bold">Only {item.stock} units left</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-200/50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-amber-700" />
                  </div>
                </div>
              ))}
              {inventory.filter(i => i.stock <= i.minStock).length === 0 && (
                <div className="col-span-3 text-center py-6 text-slate-400 font-medium italic">
                  All items are sufficiently stocked.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
