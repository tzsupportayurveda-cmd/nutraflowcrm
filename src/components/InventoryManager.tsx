
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
  Minus
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
import { InventoryItem } from '@/src/types';
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
    const unsub = dataService.subscribeInventory((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Inventory & Stock</h1>
          <p className="text-slate-500">Manage your product levels, formulations, and batch tracking.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 border-slate-200">
            <History className="w-4 h-4" /> Batch History
          </Button>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold h-10 px-4 rounded-lg inline-flex items-center transition-colors">
              <Box className="w-4 h-4" /> New Product
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" className="col-span-3" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Input id="category" className="col-span-3" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sku" className="text-right">SKU</Label>
                  <Input id="sku" className="col-span-3" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock" className="text-right">Initial Stock</Label>
                  <Input id="stock" type="number" className="col-span-3" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="minStock" className="text-right">Min Stock</Label>
                  <Input id="minStock" type="number" className="col-span-3" value={newItem.minStock} onChange={e => setNewItem({...newItem, minStock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">Price (₹)</Label>
                  <Input id="price" type="number" className="col-span-3" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddProduct}>Save Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <p className="text-sm font-medium text-emerald-800">Total SKU Count</p>
          <p className="text-2xl font-bold text-emerald-900">{items.length}</p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-sm font-medium text-amber-800">Low Stock Items</p>
          <p className="text-2xl font-bold text-amber-900">
            {items.filter(i => i.stock <= i.minStock).length}
          </p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm font-medium text-blue-800">Total Stock Value</p>
          <p className="text-2xl font-bold text-blue-900">
            ₹{items.reduce((acc, i) => acc + (i.stock * i.price), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[200px] flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4 p-10">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500 font-medium">Scanning inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-20 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-200" />
            <div>
              <p className="text-slate-900 font-semibold text-lg">Inventory is empty</p>
              <p className="max-w-xs mx-auto">Start by adding your first product formulation to track stock and sales.</p>
            </div>
            <Button className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setIsAddOpen(true)}>Add Product</Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal border-slate-200">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{item.stock}</span>
                        <span className="text-slate-400 text-xs shrink-0 font-medium">/ min {item.minStock}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            item.stock <= item.minStock ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min((item.stock / (item.minStock * 2)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-600">₹{item.price.toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-slate-900">₹{(item.stock * item.price).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-semibold"
                      onClick={() => {
                        setSelectedItem(item);
                        setNewStock(item.stock);
                        setIsUpdateOpen(true);
                      }}
                    >
                      Update Stock
                    </Button>
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
