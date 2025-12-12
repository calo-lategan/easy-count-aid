import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Minus, Package, AlertTriangle, Check, X, Edit } from 'lucide-react';
import { ConditionSelector } from '@/components/stock/ConditionSelector';

interface WebhookData {
  item_name: string;
  sku: string;
  amount: number;
  condition?: 'new' | 'good' | 'damaged' | 'broken';
}

interface WebhookConfirmationPopupProps {
  open: boolean;
  onClose: () => void;
  data: WebhookData | null;
  onConfirm: (action: 'add' | 'remove', data: WebhookData & { condition?: 'new' | 'good' | 'damaged' | 'broken' }) => Promise<void>;
}

type Step = 'initial' | 'confirm-add' | 'edit-details';

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
  const [step, setStep] = useState<Step>('initial');
  
  // Editable fields
  const [editedName, setEditedName] = useState('');
  const [editedSku, setEditedSku] = useState('');
  const [editedAmount, setEditedAmount] = useState(0);
  const [editedCondition, setEditedCondition] = useState<'new' | 'good' | 'damaged' | 'broken'>('new');

  useEffect(() => {
    if (initialData) {
      setData({ ...initialData });
      setEditedName(initialData.item_name);
      setEditedSku(initialData.sku);
      setEditedAmount(initialData.amount);
      setEditedCondition(initialData.condition || 'new');
      setStep('initial');
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

  const handleClose = () => {
    setStep('initial');
    onClose();
  };

  const handleAddClick = () => {
    setStep('confirm-add');
  };

  const handleConfirmYes = async () => {
    if (!data) return;

    setLoading(true);
    try {
      await onConfirm('add', { ...data, condition: data.condition || 'new' });
      toast({ 
        title: 'Success', 
        description: `Added ${data.amount} units of ${data.item_name} (${data.condition || 'new'})` 
      });
      handleClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add stock', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmNo = () => {
    setStep('edit-details');
  };

  const handleSaveEditedDetails = async () => {
    if (!editedName.trim() || !editedSku.trim()) {
      toast({ title: 'Error', description: 'Name and SKU are required', variant: 'destructive' });
      return;
    }
    if (editedAmount <= 0) {
      toast({ title: 'Error', description: 'Amount must be greater than 0', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await onConfirm('add', { 
        item_name: editedName.trim(), 
        sku: editedSku.trim(), 
        amount: editedAmount,
        condition: editedCondition 
      });
      toast({ 
        title: 'Success', 
        description: `Added ${editedAmount} units of ${editedName} (${editedCondition})` 
      });
      handleClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add stock', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!data) return;

    // Validation
    if (!existingItem) {
      toast({ title: 'Error', description: 'Cannot remove from non-existent item', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await onConfirm('remove', data);
      toast({ 
        title: 'Success', 
        description: `Removed ${data.amount} units of ${data.item_name}` 
      });
      handleClose();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to remove stock', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!data) return null;

  // Initial popup with incoming data
  if (step === 'initial') {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
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
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">New Item</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">This item doesn't exist yet. Adding will create it.</p>
                </div>
              </div>
            )}

            {/* Webhook Data Display */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{data.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono">{data.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-lg">{data.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition:</span>
                <span className="capitalize font-medium">{data.condition || 'new'}</span>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">After action:</p>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  Add → {existingItem ? existingItem.current_quantity + data.amount : data.amount}
                </Badge>
                {existingItem && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                    Remove → {existingItem.current_quantity - data.amount}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            {existingItem && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={loading}
                className="gap-2 text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Minus className="h-4 w-4" />
                Remove
              </Button>
            )}
            <Button
              onClick={handleAddClick}
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

  // Confirm Add popup - "Add X units of Item? Yes/No"
  if (step === 'confirm-add') {
    return (
      <AlertDialog open={open} onOpenChange={(open) => !open && handleClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Addition</AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              Add <span className="font-bold text-foreground">{data.amount}</span> units of{' '}
              <span className="font-bold text-foreground">{data.item_name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleConfirmNo} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              No, Edit Details
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmYes} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Yes, Add Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Edit Details popup - allows editing name, SKU, amount, and condition
  if (step === 'edit-details') {
    return (
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Item Name</Label>
              <Input
                id="editName"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="h-12"
                placeholder="Enter item name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSku">SKU / Stock Number</Label>
              <Input
                id="editSku"
                value={editedSku}
                onChange={(e) => setEditedSku(e.target.value)}
                className="h-12 font-mono"
                placeholder="Enter SKU"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAmount">Quantity</Label>
              <Input
                id="editAmount"
                type="number"
                min="1"
                value={editedAmount}
                onChange={(e) => setEditedAmount(parseInt(e.target.value) || 0)}
                className="text-lg h-12"
              />
            </div>

            <ConditionSelector
              value={editedCondition}
              onChange={setEditedCondition}
              label="Condition"
            />

            {existingItem && (
              <p className="text-sm text-muted-foreground">
                Current stock: {existingItem.current_quantity} → After: {existingItem.current_quantity + editedAmount}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep('confirm-add')} disabled={loading}>
              Back
            </Button>
            <Button 
              onClick={handleSaveEditedDetails} 
              disabled={loading || editedAmount <= 0 || !editedName.trim() || !editedSku.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Save & Add Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
