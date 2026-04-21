
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  AlertTriangle,
  ArrowUpDown,
  History,
  Box,
  Loader2
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

export function InventoryManager() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = dataService.subscribeInventory((data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Box className="w-4 h-4" /> New Product
          </Button>
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
            ${items.reduce((acc, i) => acc + (i.stock * i.price), 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[200px] flex flex-col items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4 p-10">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-slate-500">Scanning inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-20 text-center">
            <Package className="w-12 h-12 text-slate-200" />
            <div>
              <p className="text-slate-900 font-semibold">Inventory is empty</p>
              <p className="text-slate-500">Start by adding your first product formulation.</p>
            </div>
            <Button className="mt-2 bg-emerald-500 hover:bg-emerald-600">Add Product</Button>
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
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.stock}</span>
                        <span className="text-slate-400 text-xs shrink-0">/ min {item.minStock}</span>
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
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">${(item.stock * item.price).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {item.stock <= item.minStock ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1 border-amber-200 border">
                        <AlertTriangle className="w-3 h-3" /> Restock
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                        In Stock
                      </Badge>
                    )}
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
