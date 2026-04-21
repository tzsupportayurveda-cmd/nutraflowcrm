
import React, { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Package as PackageIcon, 
  DollarSign,
  Clock
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
import { dataService } from '@/src/services/dataService';
import { Lead, Order, InventoryItem } from '@/src/types';

const chartData = [
  { name: 'Jan', leads: 40, revenue: 2400 },
  { name: 'Feb', leads: 30, revenue: 1398 },
  { name: 'Mar', leads: 20, revenue: 9800 },
  { name: 'Apr', leads: 27, revenue: 3908 },
  { name: 'May', leads: 18, revenue: 4800 },
  { name: 'Jun', leads: 23, revenue: 3800 },
];

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const unsubLeads = dataService.subscribeLeads(setLeads);
    const unsubOrders = dataService.subscribeOrders(setOrders);
    const unsubInv = dataService.subscribeInventory(setInventory);

    return () => {
      unsubLeads();
      unsubOrders();
      unsubInv();
    };
  }, []);

  const totalLeads = leads.length;
  const totalRevenue = orders.reduce((acc, order) => acc + order.total, 0);
  const lowStockItems = inventory.filter(item => item.stock <= item.minStock).length;
  const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Business Overview</h1>
        <p className="text-slate-500">Welcome back. Here's what's happening with your nutraceutical business today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Leads</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +8.4% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Low Stock Alert</CardTitle>
            <PackageIcon className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
              Items need restocking soon
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Active Orders</CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-slate-500 mt-1">Currently in processing</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Monthly sales performance across all categories.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle>Lead Flow</CardTitle>
            <CardDescription>New leads generated per month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={{ fill: '#10b981', r: 4 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
