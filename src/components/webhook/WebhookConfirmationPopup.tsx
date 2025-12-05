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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Minus, Package, AlertTriangle } from 'lucide-react';

interface WebhookData {
  item_name: string;
  sku: string;
  amount: number;
}

interface WebhookConfirmationPopupProps {
  open: boolean;
  onClose: () => void;
  data: WebhookData | null;
  onConfirm: (action: 'add' | 'remove', data: WebhookData) => Promise<void>;
}

export function WebhookConfirmationPopup({ 
  open, 
  onClose, 
  data: initialData,
  onConfirm 
}: WebhookConfirmationPopupProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WebhookData | null>(null);
  const [existingItem, setExistingItem] = useState<{ name: string; current_quantity: number } | null>(null);

  useEffect(() => {
    if (initialData) {
      setData({ ...initialData });
      // Check if item exists
      checkExistingItem(initialData.sku);
    }
  }, [initialData]);

  const checkExistingItem = async (sku: string) => {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('name, current_quantity')
      .eq('sku', sku)
      .maybeSingle();
    
    setExistingItem(item);
  };

  const handleConfirm = async (action: 'add' | 'remove') => {
    if (!data) return;

    // Validation
    if (!data.item_name.trim()) {
      toast({ title: 'Error', description: 'Item name is required', variant: 'destructive' });
      return;
    }
    if (!data.sku.trim()) {
      toast({ title: 'Error', description: 'SKU is required', variant: 'destructive' });
      return;
    }
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      toast({ title: 'Error', description: 'Amount must be a positive integer', variant: 'destructive' });
      return;
    }

    // Check for removal from non-existent or insufficient stock
    if (action === 'remove') {
      if (!existingItem) {
        toast({ title: 'Error', description: 'Cannot remove from non-existent item', variant: 'destructive' });
        return;
      }
      if (data.amount > existingItem.current_quantity) {
        toast({ 
          title: 'Error', 
          description: `Cannot remove ${data.amount}. Only ${existingItem.current_quantity} available.`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setLoading(true);
    try {
      await onConfirm(action, data);
      toast({ 
        title: 'Success', 
        description: `Stock ${action === 'add' ? 'added' : 'removed'} successfully` 
      });
      onClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update stock', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Incoming Stock Update
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing item info */}
          {existingItem ? (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Existing item found:</p>
              <p className="font-medium">{existingItem.name}</p>
              <p className="text-sm">Current stock: <span className="font-bold">{existingItem.current_quantity}</span></p>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-300">New Item</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">This item doesn't exist yet. Adding will create it.</p>
              </div>
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-3">
            <div>
              <Label>Item Name</Label>
              <Input
                value={data.item_name}
                onChange={(e) => setData({ ...data, item_name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={data.sku}
                onChange={(e) => {
                  setData({ ...data, sku: e.target.value });
                  if (e.target.value) checkExistingItem(e.target.value);
                }}
                placeholder="SKU"
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                min="1"
                value={data.amount}
                onChange={(e) => setData({ ...data, amount: parseInt(e.target.value) || 0 })}
                placeholder="Amount"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Preview:</p>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Add: {existingItem ? existingItem.current_quantity + data.amount : data.amount}
              </Badge>
              {existingItem && (
                <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                  Remove: {Math.max(0, existingItem.current_quantity - data.amount)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          {existingItem && (
            <Button
              variant="outline"
              onClick={() => handleConfirm('remove')}
              disabled={loading || data.amount > existingItem.current_quantity}
              className="gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <Minus className="h-4 w-4" />
              Remove
            </Button>
          )}
          <Button
            onClick={() => handleConfirm('add')}
            disabled={loading}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
