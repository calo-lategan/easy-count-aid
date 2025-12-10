import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberPad } from '@/components/inventory/NumberPad';
import { useInventoryItems } from '@/hooks/useInventory';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Check, X, Pencil, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem } from '@/lib/indexedDb';

interface AIResult {
  itemName: string;
  quantity: number;
  confidence: number;
  matchedSku: string | null;
  notes: string;
}

interface LocationState {
  aiResult?: AIResult;
  matchedItem?: InventoryItem;
  capturedImage?: string;
  type: 'add' | 'remove';
}

export default function ConfirmEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { items, addItem, updateQuantity } = useInventoryItems();
  const { user } = useAuth();
  
  const state = location.state as LocationState;
  const { aiResult, matchedItem, type } = state || {};

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustedQuantity, setAdjustedQuantity] = useState(
    aiResult?.quantity?.toString() || '1'
  );
  const [itemName, setItemName] = useState(
    matchedItem?.name || aiResult?.itemName || ''
  );
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(
    matchedItem || null
  );
  const [isNewItem, setIsNewItem] = useState(!matchedItem);
  const [newSku, setNewSku] = useState('');

  const handleConfirm = async () => {
    const quantity = parseInt(adjustedQuantity) || 0;
    if (quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isNewItem) {
        // Create new item and add stock
        if (!itemName.trim() || !newSku.trim()) {
          toast({
            title: 'Missing Information',
            description: 'Please enter item name and SKU.',
            variant: 'destructive',
          });
          return;
        }

        const newItem = await addItem({
          name: itemName,
          sku: newSku,
          current_quantity: type === 'add' ? quantity : 0,
        });

        if (type === 'remove' && newItem) {
          await updateQuantity(
            newItem.id,
            quantity,
            type,
            user?.id,
            aiResult ? 'ai_assisted' : 'manual',
            aiResult?.confidence
          );
        }
      } else if (selectedItem) {
        // Update existing item
        await updateQuantity(
          selectedItem.id,
          quantity,
          type,
          user?.id,
          aiResult ? 'ai_assisted' : 'manual',
          aiResult?.confidence,
          isAdjusting ? 'Quantity manually adjusted from AI suggestion' : undefined
        );
      }

      toast({
        title: 'Success',
        description: `Stock ${type === 'add' ? 'added' : 'removed'} successfully.`,
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update inventory.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleSelectExistingItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemName(item.name);
    setIsNewItem(false);
  };

  if (!state) {
    return (
      <AppLayout title="Confirm Entry">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p>No data to confirm. Please scan or enter items first.</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Confirm Entry">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={handleCancel} className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          Cancel
        </Button>

        {/* AI Result Summary */}
        {aiResult && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">AI Detection</p>
              <p className="text-lg font-semibold">{aiResult.itemName}</p>
              <p className="text-sm">Suggested quantity: {aiResult.quantity}</p>
              <p className="text-xs text-muted-foreground">
                Confidence: {aiResult.confidence}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Confirmation Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {type === 'add' ? (
                <Plus className="h-6 w-6 text-green-600" />
              ) : (
                <Minus className="h-6 w-6 text-orange-600" />
              )}
              {type === 'add' ? 'Add Stock' : 'Remove Stock'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Item Selection */}
            {!isNewItem && selectedItem ? (
              <div className="space-y-2">
                <Label>Selected Item</Label>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedItem.sku}</p>
                  <p className="text-sm">Current stock: {selectedItem.current_quantity}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedItem(null);
                    setIsNewItem(true);
                  }}
                >
                  Select Different Item
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Enter item name"
                    className="h-14 text-lg"
                  />
                </div>

                {/* Existing items dropdown */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Or select existing item:</Label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {items
                        .filter(i => 
                          i.name.toLowerCase().includes(itemName.toLowerCase()) ||
                          !itemName
                        )
                        .slice(0, 5)
                        .map(item => (
                          <Button
                            key={item.id}
                            variant="outline"
                            className="w-full justify-start h-auto py-3"
                            onClick={() => handleSelectExistingItem(item)}
                          >
                            <div className="text-left">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku} | Stock: {item.current_quantity}
                              </p>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </div>
                )}

                {isNewItem && (
                  <div className="space-y-2">
                    <Label>SKU / Stock Number</Label>
                    <Input
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="Enter SKU"
                      className="h-14 text-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Quantity</Label>
                {aiResult && !isAdjusting && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdjusting(true)}
                    className="gap-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Adjust
                  </Button>
                )}
              </div>

              {isAdjusting || !aiResult ? (
                <>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <span className="text-4xl font-bold">
                      {adjustedQuantity || '0'}
                    </span>
                  </div>
                  <NumberPad
                    value={adjustedQuantity}
                    onChange={setAdjustedQuantity}
                  />
                </>
              ) : (
                <div className="text-center p-6 bg-muted rounded-lg">
                  <span className="text-5xl font-bold">{adjustedQuantity}</span>
                  <p className="text-sm text-muted-foreground mt-2">
                    AI suggested quantity
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-lg gap-2"
                onClick={handleCancel}
              >
                <X className="h-6 w-6" />
                Cancel
              </Button>
              <Button
                size="lg"
                className="h-16 text-lg gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleConfirm}
              >
                <Check className="h-6 w-6" />
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
