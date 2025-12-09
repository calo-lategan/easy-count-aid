import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberPad } from '@/components/inventory/NumberPad';
import { ConditionSelector } from '@/components/stock/ConditionSelector';
import { useInventoryItems, useDeviceUsers } from '@/hooks/useInventory';
import { ArrowLeft, Plus, Minus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InventoryItem } from '@/lib/indexedDb';

interface LocationState {
  type?: 'add' | 'remove';
}

export default function ManualEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { items, addItem, updateQuantity } = useInventoryItems();
  const { currentUser } = useDeviceUsers();
  
  const state = location.state as LocationState;
  
  const [type, setType] = useState<'add' | 'remove'>(state?.type || 'add');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState('');
  const [isNewItem, setIsNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [condition, setCondition] = useState<'new' | 'good' | 'damaged' | 'broken'>('new');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsNewItem(false);
  };

  const handleCreateNew = () => {
    setSelectedItem(null);
    setIsNewItem(true);
  };

  const handleSubmit = async () => {
    const qty = parseInt(quantity) || 0;
    
    try {
      if (isNewItem) {
        if (!newItemName.trim() || !newItemSku.trim()) {
          toast({
            title: 'Missing Information',
            description: 'Please enter item name and SKU.',
            variant: 'destructive',
          });
          return;
        }

        // Allow creating items with 0 initial quantity
        const initialQty = type === 'add' ? qty : 0;
        await addItem({
          name: newItemName,
          sku: newItemSku,
          current_quantity: initialQty,
          condition,
        });

        toast({
          title: 'Item Created',
          description: initialQty > 0 
            ? `${newItemName} added with ${initialQty} units.`
            : `${newItemName} created with no initial stock.`,
        });
      } else if (selectedItem) {
        if (qty <= 0) {
          toast({
            title: 'Invalid Quantity',
            description: 'Please enter a quantity greater than 0.',
            variant: 'destructive',
          });
          return;
        }
        
        await updateQuantity(
          selectedItem.id,
          qty,
          type,
          currentUser?.id,
          'manual'
        );

        toast({
          title: 'Stock Updated',
          description: `${type === 'add' ? 'Added' : 'Removed'} ${qty} units of ${selectedItem.name}.`,
        });
      }

      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update inventory.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="Manual Entry">
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>

        {/* Type Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            variant={type === 'add' ? 'default' : 'outline'}
            className={`h-14 text-lg gap-2 ${type === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setType('add')}
          >
            <Plus className="h-6 w-6" />
            Add Stock
          </Button>
          <Button
            size="lg"
            variant={type === 'remove' ? 'default' : 'outline'}
            className={`h-14 text-lg gap-2 ${type === 'remove' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
            onClick={() => setType('remove')}
          >
            <Minus className="h-6 w-6" />
            Remove Stock
          </Button>
        </div>

        {/* Item Selection */}
        {!selectedItem && !isNewItem && (
          <Card>
            <CardHeader>
              <CardTitle>Select Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-14 text-lg"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredItems.map(item => (
                  <Button
                    key={item.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-4"
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {item.sku} | Current: {item.current_quantity}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full h-14 text-lg gap-2"
                onClick={handleCreateNew}
              >
                <Plus className="h-5 w-5" />
                Add New Item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* New Item Form */}
        {isNewItem && (
          <Card>
            <CardHeader>
              <CardTitle>New Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter item name"
                  className="h-14 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label>SKU / Stock Number</Label>
                <Input
                  value={newItemSku}
                  onChange={(e) => setNewItemSku(e.target.value)}
                  placeholder="Enter SKU"
                  className="h-14 text-lg"
                />
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsNewItem(false)}
              >
                Cancel - Select Existing Item
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selected Item Display */}
        {selectedItem && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{selectedItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    SKU: {selectedItem.sku} | Current: {selectedItem.current_quantity}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quantity Input */}
        {(selectedItem || isNewItem) && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Quantity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {type === 'add' && (
                <ConditionSelector
                  value={condition}
                  onChange={setCondition}
                  label="Condition of items being added"
                />
              )}
              
              <div className="text-center p-4 bg-muted rounded-lg">
                <span className="text-4xl font-bold">{quantity || '0'}</span>
              </div>
              
              <NumberPad value={quantity} onChange={setQuantity} />

              <Button
                size="lg"
                className={`w-full h-16 text-xl ${
                  type === 'add' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
                onClick={handleSubmit}
                disabled={isNewItem ? false : (!quantity || parseInt(quantity) <= 0)}
              >
                {isNewItem && (!quantity || parseInt(quantity) === 0) 
                  ? 'Create Item (No Stock)'
                  : `${type === 'add' ? 'Add' : 'Remove'} ${quantity || '0'} Units`
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
