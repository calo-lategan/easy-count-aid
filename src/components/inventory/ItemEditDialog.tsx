import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConditionSelector } from '@/components/stock/ConditionSelector';
import { Category } from '@/hooks/useCategories';
import { InventoryItem } from '@/lib/indexedDb';

interface ItemEditDialogProps {
  item: InventoryItem | null;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onSave: (updates: Partial<InventoryItem>) => Promise<void>;
}

export function ItemEditDialog({ 
  item, 
  categories, 
  open, 
  onClose, 
  onSave 
}: ItemEditDialogProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [condition, setCondition] = useState<'good' | 'damaged' | 'broken'>('good');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSku(item.sku);
      setCategoryId(item.category_id || null);
      setCondition(item.condition || 'good');
      setLowStockThreshold(item.low_stock_threshold ?? 5);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      await onSave({
        name,
        sku,
        category_id: categoryId,
        condition,
        low_stock_threshold: lowStockThreshold,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={categoryId || 'none'} 
              onValueChange={(value) => setCategoryId(value === 'none' ? null : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Category</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Condition</Label>
            <ConditionSelector
              value={condition}
              onChange={setCondition}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="threshold">Low Stock Alert Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">
              Alert when stock falls at or below this number
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}