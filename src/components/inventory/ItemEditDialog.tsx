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
import { ImageUpload } from '@/components/inventory/ImageUpload';
import { Category } from '@/hooks/useCategories';
import { InventoryItem } from '@/lib/indexedDb';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

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
  const { isAdmin } = useAuth();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [condition, setCondition] = useState<'new' | 'good' | 'damaged' | 'broken'>('good');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSku(item.sku);
      setCategoryId(item.category_id || null);
      setCondition((item.condition as 'new' | 'good' | 'damaged' | 'broken') || 'good');
      setLowStockThreshold(item.low_stock_threshold ?? 5);
      setImageUrl(item.reference_image_url || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    
    setLoading(true);
    try {
      const updates: Partial<InventoryItem> = {
        condition,
        low_stock_threshold: lowStockThreshold,
        reference_image_url: imageUrl || undefined,
      };

      // Only admins can edit name, SKU, and category
      if (isAdmin) {
        updates.name = name;
        updates.sku = sku;
        updates.category_id = categoryId;
      }

      await onSave(updates);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Item Image</Label>
            <ImageUpload
              currentImageUrl={imageUrl}
              onImageUploaded={setImageUrl}
              itemId={item.id}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              Name
              {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name"
              disabled={!isAdmin}
              className={!isAdmin ? 'opacity-50' : ''}
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">Admin only</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku" className="flex items-center gap-2">
              SKU
              {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU"
              disabled={!isAdmin}
              className={!isAdmin ? 'opacity-50' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Category
              {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Select 
              value={categoryId || 'none'} 
              onValueChange={(value) => setCategoryId(value === 'none' ? null : value)}
              disabled={!isAdmin}
            >
              <SelectTrigger className={!isAdmin ? 'opacity-50' : ''}>
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
              label=""
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
