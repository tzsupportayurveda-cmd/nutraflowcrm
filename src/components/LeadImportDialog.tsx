import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { dataService } from '@/src/services/dataService';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Lead } from '../types';
import { useAuth } from '@/src/contexts/AuthContext';

interface LeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadImportDialog({ open, onOpenChange }: LeadImportDialogProps) {
  const { user: currentUser } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: '',
    phone: '',
    product: '',
    state: '',
    city: '',
    source: '',
    value: ''
  });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length > 0) {
          const sheetHeaders = data[0] as string[];
          setHeaders(sheetHeaders);
          setFile(selectedFile);
          
          // Basic auto-mapping
          const newMapping = { ...mapping };
          sheetHeaders.forEach(h => {
            const lowH = h.toLowerCase();
            if (lowH.includes('name')) newMapping.name = h;
            if (lowH.includes('phone') || lowH.includes('mobile') || lowH.includes('number')) newMapping.phone = h;
            if (lowH.includes('product')) newMapping.product = h;
            if (lowH.includes('state')) newMapping.state = h;
            if (lowH.includes('city')) newMapping.city = h;
            if (lowH.includes('source')) newMapping.source = h;
            if (lowH.includes('value') || lowH.includes('price')) newMapping.value = h;
          });
          setMapping(newMapping);

          // Get actual data for import (skip header row)
          const jsonData = XLSX.utils.sheet_to_json(ws);
          setPreviewData(jsonData);
        }
      } catch (err) {
        toast.error('Error reading Excel file');
        console.error(err);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!mapping.name || !mapping.phone) {
      toast.error('Name and Phone columns must be mapped');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const row of previewData) {
        try {
          const leadData: Partial<Lead> = {
            name: String(row[mapping.name] || 'Unknown'),
            phone: String(row[mapping.phone] || ''),
            product: String(row[mapping.product] || 'General Product'),
            state: String(row[mapping.state] || ''),
            city: String(row[mapping.city] || ''),
            source: String(row[mapping.source] || 'Excel Import'),
            value: Number(row[mapping.value]) || 0,
            status: 'New Lead',
            assignedTo: currentUser?.name || 'Unassigned',
            assignedToId: currentUser?.id || 'system',
            paymentMode: 'COD'
          };

          if (leadData.phone) {
            await dataService.addLead(leadData as Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'history'>);
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          failCount++;
        }
      }

      toast.success(`Import Complete: ${successCount} leads added${failCount > 0 ? `, ${failCount} failed` : ''}`);
      onOpenChange(false);
      resetInternal();
    } catch (err) {
      toast.error('Bulk import failed');
    } finally {
      setImporting(false);
    }
  };

  const resetInternal = () => {
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setMapping({
      name: '',
      phone: '',
      product: '',
      state: '',
      city: '',
      source: '',
      value: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!importing) onOpenChange(val); }}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
        <div className="bg-slate-900 p-8 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Bulk Lead Import</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 font-medium">
              अपनी Excel (.xlsx) या CSV फ़ाइल अपलोड करें और CRM के साथ डेटा मैच करें।
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-700">Click to upload Excel or CSV</p>
                <p className="text-sm text-slate-400 font-medium mt-1">Make sure your file has headers in the first row</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{file.name}</p>
                    <p className="text-xs text-emerald-600/70 font-medium">{previewData.length} records found</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetInternal} className="text-xs font-bold text-emerald-700 hover:bg-emerald-100">Change File</Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">CRM Field Mapping</h4>
                  {Object.entries(mapping).map(([field, mappedHeader]) => (
                    <div key={field} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 capitalize">
                        {field.replace(/([A-Z])/g, ' $1')} {field === 'name' || field === 'phone' ? '*' : ''}
                      </label>
                      <select 
                        value={mappedHeader} 
                        onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                        className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="">Select Column</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <AlertCircle className="w-8 h-8 text-emerald-400 mb-4" />
                    <h4 className="text-lg font-black uppercase tracking-tight mb-2">Instructions</h4>
                    <ul className="text-xs space-y-3 text-slate-400 font-medium">
                      <li className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        First row must be headings.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        Customer Name and Phone are required.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        Leads will be added as "New Lead" status.
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-400">•</span>
                        Large files might take a few moments.
                      </li>
                    </ul>
                  </div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-white border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            disabled={importing}
            className="text-xs font-black uppercase tracking-widest text-slate-400"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px] h-12 rounded-2xl text-xs font-black uppercase tracking-widest gap-2 shadow-lg shadow-emerald-600/20"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Start Bulk Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
