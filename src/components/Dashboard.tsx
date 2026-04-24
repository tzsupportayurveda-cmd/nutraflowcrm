
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
  FileText,
  Trophy,
  AlertTriangle
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
import { Badge } from '@/components/ui/badge';
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
import { Lead, Order, InventoryItem, User, Task } from '@/src/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { startOfDay, startOfMonth, isAfter, parseISO, format, isSameDay, isBefore, endOfDay } from 'date-fns';

type DateFilter = 'today' | 'month' | 'all' | 'custom';

export function Dashboard() {
  const { user: currentUser } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    const unsubLeads = dataService.subscribeLeads(currentUser, setLeads);
    const unsubOrders = dataService.subscribeOrders(currentUser, setOrders);
    const unsubInv = dataService.subscribeInventory(setInventory);

    let unsubTasks = () => {};
    if (currentUser) {
      unsubTasks = dataService.subscribeTasks(currentUser.id, (data) => {
        setTasks(data);
        setLoadingTasks(false);
      });
    }

    if (currentUser?.role === 'Admin') {
      dataService.getTeamMembers().then(setTeamMembers);
    }

    return () => {
      unsubLeads();
      unsubOrders();
      unsubInv();
      unsubTasks();
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
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      const start = startOfDay(parseISO(customStartDate));
      const end = endOfDay(parseISO(customEndDate));
      resultLeads = resultLeads.filter(l => {
        const leadDate = parseISO(l.createdAt);
        return (isAfter(leadDate, start) || isSameDay(leadDate, start)) && 
               (isBefore(leadDate, end) || isSameDay(leadDate, end));
      });
      resultOrders = resultOrders.filter(o => {
        const orderDate = parseISO(o.createdAt);
        return (isAfter(orderDate, start) || isSameDay(orderDate, start)) && 
               (isBefore(orderDate, end) || isSameDay(orderDate, end));
      });
    }

    return { filteredLeads: resultLeads, filteredOrders: resultOrders };
  }, [leads, orders, dateFilter, selectedAgentId, currentUser, customStartDate, customEndDate]);

  const { filteredLeads, filteredOrders } = filteredData;

  const leaderboardData = useMemo(() => {
    const leaderMap: Record<string, { id: string, name: string, confirmed: number, revenue: number, avatar?: string }> = {};

    leads.forEach(l => {
      if (l.status === 'Confirmed') {
        if (!leaderMap[l.assignedToId]) {
          leaderMap[l.assignedToId] = { id: l.assignedToId, name: l.assignedTo, confirmed: 0, revenue: 0 };
        }
        leaderMap[l.assignedToId].confirmed++;
      }
    });

    orders.forEach(o => {
      if (!leaderMap[o.agentId || '']) {
        leaderMap[o.agentId || ''] = { id: o.agentId || '', name: o.agentName || 'Unknown Agent', confirmed: 0, revenue: 0 };
      }
      leaderMap[o.agentId || ''].revenue += o.total;
    });

    // Match with team members for avatars/roles
    const finalData = Object.values(leaderMap).map(l => {
      const member = teamMembers.find(m => m.id === l.id);
      return { ...l, avatar: member?.avatar };
    });

    // Sort by revenue primarily, then confirmed
    return finalData.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [leads, orders, teamMembers]);

  const stats = {
    leads: filteredLeads.length,
    revenue: filteredOrders.reduce((acc, o) => acc + o.total, 0),
    earnings: filteredOrders.reduce((acc, o) => acc + (o.commission || 0), 0),
    confirmed: filteredLeads.filter(l => l.status === 'Order Confirmed').length,
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
                  <Button variant="ghost" className="h-10 px-4 gap-2 border-r border-slate-100 rounded-none first:rounded-xl last:rounded-r-xl">
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
                <DropdownMenuItem onSelect={() => setSelectedAgentId('all')} className="rounded-lg">All Company Data</DropdownMenuItem>
                <DropdownMenuSeparator />
                {teamMembers.map(member => (
                  <DropdownMenuItem 
                    key={member.id} 
                    onSelect={() => setSelectedAgentId(member.id)}
                    className="rounded-lg gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{member.name}</span>
                        <span className={cn(
                          "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                          member.role === 'Manager' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {member.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono italic">ID: {member.id.substring(0, 8)}...</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex p-1 bg-slate-50 rounded-xl">
            {(['today', 'month', 'all', 'custom'] as const).map((filter) => (
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

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">From</span>
                <input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">To</span>
                <input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {currentUser?.role === 'Sales' ? (
          <Card className="border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all group bg-slate-900 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">My Earnings</CardTitle>
              <div className="p-2 bg-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">₹{stats.earnings.toLocaleString()}</div>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-2">
                <Target className="w-3 h-3 text-emerald-400" /> Commission earned
              </p>
            </CardContent>
          </Card>
        ) : (
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
        )}

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
          <CardHeader className="bg-white border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-slate-900">Revenue Growth</CardTitle>
              <CardDescription className="font-medium">Company earnings over time based on confirmed orders.</CardDescription>
            </div>
            <div className="flex -space-x-2">
              {leaderboardData.slice(0, 3).map((agent, i) => (
                <div key={agent.id} className={cn(
                  "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-slate-100",
                  i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-300" : "bg-amber-600"
                )}>
                  {agent.name.charAt(0)}
                </div>
              ))}
            </div>
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
                  <Bar dataKey="revenue" fill={cn(currentUser?.role === 'Admin' ? "#10b981" : "#3b82f6")} radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Leaderboard */}
        <Card className="lg:col-span-3 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-slate-900 text-white border-none">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Sales Superstars
                </CardTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">This Month's Leaderboard</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-2 font-black text-[9px] uppercase tracking-tighter">
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {leaderboardData.length > 0 ? leaderboardData.map((agent, index) => (
                <div key={agent.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {index === 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center z-10 shadow-sm"><Trophy className="w-2.5 h-2.5 text-slate-900" /></div>}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm",
                        index === 0 ? "bg-amber-100 text-amber-700" : 
                        index === 1 ? "bg-slate-100 text-slate-600" : 
                        index === 2 ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-600"
                      )}>
                        {agent.name.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <p className="font-black text-slate-900 flex items-center gap-2">
                        {agent.name}
                        {index < 3 && (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-tighter px-1 rounded-sm",
                            index === 0 ? "bg-amber-400 text-slate-900" : 
                            index === 1 ? "bg-slate-300 text-slate-700" : "bg-orange-400 text-white"
                          )}>
                            Rank #{index + 1}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {agent.confirmed} Orders Confirmed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">₹{agent.revenue.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Revenue</p>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-slate-400 italic text-sm font-medium">
                  No sales recorded yet.
                </div>
              )}
            </div>
            {leaderboardData.length > 3 && (
              <div className="p-4 bg-slate-50 text-center">
                <Button variant="ghost" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 w-full">
                  View Full Rankings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-7 border-none shadow-xl shadow-slate-200/50 overflow-hidden">
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

      {/* RTO Analysis (Only for Admin) */}
      {currentUser?.role === 'Admin' && (
        <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="bg-red-50/50 border-b border-red-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                RTO Analysis
              </CardTitle>
              <CardDescription className="text-red-700/60 font-medium font-bold">Identifying high-risk products and regions for returns.</CardDescription>
            </div>
            <Badge className="bg-red-100 text-red-700 border-none font-black text-[10px] px-3">
              CRITICAL TRACKING
            </Badge>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top RTO Products</h4>
                <div className="space-y-3">
                  {[
                    { name: 'Advanced Gel Formula', rate: '12%', color: 'bg-red-500' },
                    { name: 'Booster 3X Pills', rate: '8%', color: 'bg-orange-500' },
                    { name: 'Booster Cream', rate: '5%', color: 'bg-amber-500' }
                  ].map((p, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{p.name}</span>
                        <span className="font-black text-red-600">{p.rate}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", p.color)} style={{ width: p.rate }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">High Return Regions</h4>
                <div className="space-y-2">
                  {[
                    { region: 'Bihar', count: 42, rate: '18%' },
                    { region: 'West Bengal', count: 31, rate: '15%' },
                    { region: 'Uttar Pradesh', count: 56, rate: '11%' }
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-xs text-slate-600">
                          {i + 1}
                        </div>
                        <span className="font-bold text-slate-800">{r.region}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-red-600">{r.rate}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{r.count} Returns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Tasks & Refill Reminders */}
      <Card className="border-none shadow-xl shadow-slate-200/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Action Items & Refills
            </CardTitle>
            <CardDescription className="font-medium">Stay ahead of your customer re-order cycles.</CardDescription>
          </div>
          <Badge className="bg-indigo-100 text-indigo-700 border-none font-black text-[10px] px-3">
            {tasks.length} PENDING
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.length > 0 ? tasks.map(task => (
              <div key={task.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className={cn(
                    "text-[8px] font-black uppercase tracking-tighter px-1.5 h-4",
                    task.type === 'refill' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {task.type}
                  </Badge>
                  <span className="text-[10px] font-bold text-slate-400">
                    Due {format(parseISO(task.dueDate), 'MMM dd')}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{task.description}"</p>
                <div className="pt-4 flex gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">
                    Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest h-8"
                    onClick={() => {
                        // Mark as completed logic would go here
                        toast.success('Task marked as completed');
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )) : (
              <div className="col-span-3 py-10 text-center text-slate-400 font-medium italic bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                No pending tasks. Great job staying on top of your leads!
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
