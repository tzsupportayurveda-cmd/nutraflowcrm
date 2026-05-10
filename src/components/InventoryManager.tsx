
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  History,
  Box,
  Loader2,
  Plus,
  Minus,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { dataService } from '@/src/services/dataService';
import { InventoryItem, Lead } from '@/src/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';

export function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStock, setNewStock] = useState<number>(0);
  
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    sku: '',
    stock: 0,
    minStock: 5,
    price: 0
  });

  useEffect(() => {
    const unsubInv = dataService.subscribeInventory((data) => {
      setItems(data);
    });

    // Subscribe to leads to see "Pending" demand
    const unsubLeads = dataService.subscribeLeads({ id: 'system', role: 'Admin' } as any, (data) => {
      setLeads(data);
      setLoading(false);
    });

    return () => {
      unsubInv();
      unsubLeads();
    };
  }, []);

  const getPendingDemand = (productName: string) => {
    return leads.filter(l => l.product === productName && !['Order Confirmed', 'RTO/Cancelled'].includes(l.status)).length;
  };

  const handleAddProduct = async () => {
    if (!newItem.name || !newItem.sku) {
      toast.error('Name and SKU are required');
      return;
    }
    try {
      await dataService.addInventoryItem(newItem);
      setIsAddOpen(false);
      setNewItem({ name: '', category: '', sku: '', stock: 0, minStock: 5, price: 0 });
      toast.success('Product added successfully');
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;
    try {
      await dataService.updateStock(selectedItem.id, newStock);
      setIsUpdateOpen(false);
      toast.success('Stock updated successfully');
    } catch (error) {
      toast.error('Failed to update stock');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    try {
      await dataService.deleteInventoryItem(id);
      toast.success('Product deleted successfully');
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">SKU Registry</h1>
            <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] uppercase tracking-widest px-2.5">
              Asset Tracking
            </Badge>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-tight">Systematic inventory management and valuation control.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="neo-shadow border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4">
            <History className="w-4 h-4 text-amber-500" /> Batch Audit
          </Button>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="neo-shadow bg-slate-900 hover:bg-black text-white gap-2 font-black uppercase text-[10px] tracking-widest h-10 px-4 rounded-xl inline-flex items-center transition-all">
              <Box className="w-4 h-4 text-emerald-400" /> Register SKU
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-2xl border-slate-200 shadow-2xl">
              <DialogHeader className="border-b border-slate-50 pb-4">
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Add Global SKU</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-8">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Biological Name</Label>
                  <Input id="name" className="h-11 rounded-xl border-slate-200 font-bold text-sm" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Classification</Label>
                    <Input id="category" className="h-11 rounded-xl border-slate-200 font-bold text-sm" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Serial (SKU)</Label>
                    <Input id="sku" className="h-11 rounded-xl border-slate-200 font-mono text-sm uppercase" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Onhand</Label>
                    <Input id="stock" type="number" className="h-11 rounded-xl border-slate-200 font-mono text-sm" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minStock" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Threshold</Label>
                    <Input id="minStock" type="number" className="h-11 rounded-xl border-slate-200 font-mono text-sm" value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: parseInt(e.target.value) || 0})} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valuation</Label>
                    <Input id="price" type="number" className="h-11 rounded-xl border-slate-200 font-mono text-sm" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} />
                  </div>
                </div>
              </div>
              <DialogFooter className="bg-slate-50 p-4 -m-6 mt-6 rounded-b-2xl border-t border-slate-100 flex gap-2">
                <Button variant="ghost" className="font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => setIsAddOpen(false)}>Abort</Button>
                <Button className="bg-slate-900 hover:bg-black font-black uppercase text-[10px] tracking-widest px-8" onClick={handleAddProduct}>Commit Record</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-emerald-600 transition-colors">Asset Taxonomy</p>
             <Box className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{items.length}</p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Active SKU Profiles</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-amber-600 transition-colors">Reserve Alerts</p>
             <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
            {items.filter(i => i.stock <= i.minStock).length}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Critical Restock Req.</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-slate-200/60 neo-shadow group hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-4">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-600 transition-colors">Capital Valuation</p>
             <History className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
            ₹{items.reduce((acc, i) => acc + (i.stock * i.price), 0).toLocaleString()}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">Inventory Net Worth</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden neo-shadow min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-32 gap-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-amber-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indexing Global Repository...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-32 text-center gap-8">
            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center relative">
               <Package className="w-10 h-10 text-slate-200" />
               <div className="absolute inset-0 border-2 border-dashed border-slate-100 rounded-full animate-[spin_20s_linear_infinite]" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black text-slate-900 uppercase tracking-tight">Repository Empty</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[280px] mx-auto leading-loose">Register formulation assets to initiate systematic stock tracking and valuation analysis.</p>
            </div>
            <Button className="neo-shadow bg-slate-900 hover:bg-black font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl" onClick={() => setIsAddOpen(true)}>Initialize SKU</Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-14 hover:bg-transparent border-b-slate-100">
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-6">Biological Asset</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Classification</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Internal SKU</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Stock Integrity</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Demand Index</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-4">Capitalization</TableHead>
                <TableHead className="w-14 px-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="h-20 hover:bg-slate-50/30 group transition-all border-b-slate-50">
                  <TableCell className="px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tight">{item.name}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">PRODUCT_ENTITY</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border-2 border-slate-100 text-slate-500 rounded-lg">
                      {item.category.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 font-mono text-[11px] font-black text-slate-500 uppercase tracking-tighter">{item.sku}</TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col gap-2.5 w-full max-w-[160px]">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[11px] font-black font-mono",
                          item.stock <= item.minStock ? "text-red-500" : "text-slate-900"
                        )}>{item.stock}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">MIN: {item.minStock}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200/50">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-700 ease-out",
                            item.stock <= item.minStock ? "bg-red-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          )}
                          style={{ width: `${Math.min((item.stock / (item.minStock * 2.5)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4">
                    <Badge variant="secondary" className={cn(
                      "font-black text-[9px] uppercase tracking-[0.1em] h-7 px-3 flex items-center justify-center gap-1.5 rounded-xl border-2 transition-all",
                      getPendingDemand(item.name) > 0 
                        ? "bg-blue-50 text-blue-700 border-blue-100 shadow-sm scale-105" 
                        : "bg-slate-50 text-slate-400 border-transparent shadow-none grayscale"
                    )}>
                      {getPendingDemand(item.name) > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      {getPendingDemand(item.name)} REQ
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 font-mono tracking-tight">₹{(item.stock * item.price).toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">@ ₹{item.price.toLocaleString()} AU</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-white hover:bg-emerald-500 transition-all border border-transparent hover:border-emerald-600"
                        onClick={() => {
                          setSelectedItem(item);
                          setNewStock(item.stock);
                          setIsUpdateOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Update Stock Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Update Stock Level
            </DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <p className="text-center text-slate-500 text-sm font-medium mb-6">
              Adjusting inventory for <span className="text-slate-900 font-bold">{selectedItem?.name}</span>
            </p>
            <div className="flex items-center justify-center gap-6">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-slate-200 hover:bg-slate-50 transition-colors"
                onClick={() => setNewStock(Math.max(0, newStock - 1))}
              >
                <Minus className="w-5 h-5 text-slate-600" />
              </Button>
              <div className="text-center">
                <Input 
                  type="number" 
                  className="w-28 h-12 text-center text-2xl font-black border-slate-200 focus:ring-emerald-500" 
                  value={newStock} 
                  onChange={e => setNewStock(parseInt(e.target.value) || 0)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-12 w-12 rounded-full border-slate-200 hover:bg-slate-50 transition-colors"
                onClick={() => setNewStock(newStock + 1)}
              >
                <Plus className="w-5 h-5 text-slate-600" />
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsUpdateOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={handleUpdateStock}>Update Stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
