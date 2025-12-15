import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, Table } from 'lucide-react';
import { InventoryItem, StockMovement } from '@/lib/indexedDb';
import { useAuth } from '@/contexts/AuthContext';
import XLSX from 'xlsx-js-style';
import { format } from 'date-fns';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
  movements: StockMovement[];
  users: { user_id: string; display_name: string }[];
  getCategoryPath: (id: string) => string;
}

type ExportFormat = 'excel' | 'csv';

const COLUMN_HEADERS = [
  'RowNumber',
  'lId',
  'Short Name',
  'Name',
  'Remarks',
  'Stock Keeping Unit',
  'StockMaintain',
  'Capacity',
  'Used',
  'ResourceType',
  'TaxType',
  'StockLedger',
  'StockLedgerIncome',
  'StockLedgerExpense',
  'LastModifiedBy',
  'LastModifiedOn',
  'Created On',
  'HS-Codes',
  'Working Height',
  'Group Description',
  'Sub Group Description',
  'Category Description',
  'Sub Category Description',
  'Purchase Month',
  'Purchase Year',
  'Asset Description',
  'Asset Cost',
  'Total Life',
  'Assets S. No',
  'Revenue Category',
  'Asset Type',
];

export function ExportDialog({ 
  open, 
  onClose, 
  items, 
  movements, 
  users,
  getCategoryPath 
}: ExportDialogProps) {
  const { user } = useAuth();
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [isExporting, setIsExporting] = useState(false);

  // Get current user's display name as fallback
  const currentUserDisplayName = useMemo(() => {
    if (!user) return '';
    const profile = users.find(u => u.user_id === user.id);
    return profile?.display_name || user.email || '';
  }, [user, users]);

  // Calculate condition breakdown per item from movements
  const itemConditionBreakdowns = useMemo(() => {
    const breakdowns: Record<string, Record<string, number>> = {};
    
    movements.forEach(movement => {
      const itemId = movement.item_id;
      const condition = movement.condition || 'good';
      
      if (!breakdowns[itemId]) {
        breakdowns[itemId] = { new: 0, good: 0, damaged: 0, broken: 0 };
      }
      
      if (movement.movement_type === 'add') {
        breakdowns[itemId][condition] += movement.quantity;
      } else {
        breakdowns[itemId][condition] -= movement.quantity;
      }
    });

    // Ensure no negative values
    Object.keys(breakdowns).forEach(itemId => {
      Object.keys(breakdowns[itemId]).forEach(condition => {
        if (breakdowns[itemId][condition] < 0) {
          breakdowns[itemId][condition] = 0;
        }
      });
    });

    return breakdowns;
  }, [movements]);

  // Get last modifier per item - look up by device_user_id which stores the auth user's ID
  // If no user recorded in movements, fall back to current active user
  const lastModifiers = useMemo(() => {
    const modifiers: Record<string, string> = {};
    
    // Group movements by item and get the most recent one
    const sortedMovements = [...movements].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    sortedMovements.forEach(movement => {
      if (!modifiers[movement.item_id]) {
        // device_user_id stores the auth user's ID, match against profiles' user_id
        if (movement.device_user_id) {
          const foundUser = users.find(u => u.user_id === movement.device_user_id);
          if (foundUser) {
            modifiers[movement.item_id] = foundUser.display_name;
            return;
          }
        }
        // If no user found in movement, use current active user as fallback
        modifiers[movement.item_id] = currentUserDisplayName;
      }
    });
    
    return modifiers;
  }, [movements, users, currentUserDisplayName]);

  const generateConditionString = (itemId: string): string => {
    const breakdown = itemConditionBreakdowns[itemId];
    if (!breakdown) return '';
    
    const parts: string[] = [];
    if (breakdown.new > 0) parts.push(`${breakdown.new} new`);
    if (breakdown.good > 0) parts.push(`${breakdown.good} good`);
    if (breakdown.damaged > 0) parts.push(`${breakdown.damaged} damaged`);
    if (breakdown.broken > 0) parts.push(`${breakdown.broken} broken`);
    
    return parts.join(', ') || 'No condition data';
  };

  const generateExportData = () => {
    return items.map((item, index) => ({
      'RowNumber': index + 1,
      'lId': item.sku, // lId is the SKU code
      'Short Name': item.name.substring(0, 20),
      'Name': item.name,
      'Remarks': '',
      'Stock Keeping Unit': '', // Keep blank - represents storage duration
      'StockMaintain': '',
      'Capacity': '',
      'Used': item.current_quantity,
      'ResourceType': '',
      'TaxType': '',
      'StockLedger': '',
      'StockLedgerIncome': '',
      'StockLedgerExpense': '',
      'LastModifiedBy': lastModifiers[item.id] || '',
      'LastModifiedOn': format(new Date(item.updated_at), 'yyyy-MM-dd HH:mm:ss'),
      'Created On': format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'HS-Codes': '',
      'Working Height': '',
      'Group Description': 'Site Services Workshop',
      'Sub Group Description': '',
      'Category Description': item.category_id ? getCategoryPath(item.category_id) : '',
      'Sub Category Description': '',
      'Purchase Month': '',
      'Purchase Year': '',
      'Asset Description': generateConditionString(item.id),
      'Asset Cost': '',
      'Total Life': '',
      'Assets S. No': '',
      'Revenue Category': '',
      'Asset Type': '',
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const data = generateExportData();
      const worksheet = XLSX.utils.json_to_sheet(data, { header: COLUMN_HEADERS });
      const workbook = XLSX.utils.book_new();
      
      // Set column widths based on content and header length
      const colWidths = COLUMN_HEADERS.map((header) => {
        let maxWidth = header.length;
        data.forEach(row => {
          const value = String(row[header as keyof typeof row] || '');
          maxWidth = Math.max(maxWidth, value.length);
        });
        return { wch: Math.min(Math.max(maxWidth + 2, 12), 50) };
      });
      worksheet['!cols'] = colWidths;

      if (exportFormat === 'excel') {
        // Apply blue header styling with xlsx-js-style
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              fill: { fgColor: { rgb: '4472C4' } },
              font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            };
          }
        }
        
        // Add light borders to data cells
        for (let row = 1; row <= headerRange.e.r; row++) {
          for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellAddress]) {
              worksheet[cellAddress].s = {
                border: {
                  top: { style: 'thin', color: { rgb: 'D3D3D3' } },
                  bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
                  left: { style: 'thin', color: { rgb: 'D3D3D3' } },
                  right: { style: 'thin', color: { rgb: 'D3D3D3' } },
                },
                alignment: { vertical: 'center' },
              };
            }
          }
        }
        
        // Set frozen panes - freeze first row (header)
        if (!workbook.Workbook) workbook.Workbook = {};
        if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
        workbook.Workbook.Views[0] = { RTL: false };
        
        // Create sheet views with frozen panes
        worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
        
        const fileName = `inventory-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
      } else {
        // Export as CSV for Google Sheets
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
        
        const fileName = `inventory-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
      }
      
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Inventory
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Export {items.length} items to a spreadsheet file.
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <RadioGroup 
              value={exportFormat} 
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Excel (.xlsx)</p>
                    <p className="text-xs text-muted-foreground">
                      Blue frozen headers, styled formatting
                    </p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Table className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Google Sheets (.csv)</p>
                    <p className="text-xs text-muted-foreground">
                      Import directly into Google Sheets
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              The export includes {COLUMN_HEADERS.length} columns with item details, 
              stock quantities, condition breakdowns, and timestamps.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export {exportFormat === 'excel' ? 'Excel' : 'CSV'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
