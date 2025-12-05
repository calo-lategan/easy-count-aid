import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInventoryItems, useStockMovements, useDeviceUsers } from '@/hooks/useInventory';
import { ArrowLeft, Search, Package, Plus, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@/hooks/use-toast';
import { InventoryItem } from '@/lib/indexedDb';

export default function InventoryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, deleteItem } = useInventoryItems();
  const { users } = useDeviceUsers();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    await deleteItem(itemToDelete.id);
    toast({
      title: 'Item Deleted',
      description: `${itemToDelete.name} has been removed from inventory.`,
    });
    setDeleteDialogOpen(false);
    setItemToDelete(null);
    setSelectedItem(null);
  };

  return (
    <AppLayout title="Inventory">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
          <Button onClick={() => navigate('/manual-entry')} className="gap-2">
            <Plus className="h-5 w-5" />
            Add Item
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-14 text-lg"
          />
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? 'No items match your search' : 'No items in inventory'}
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/manual-entry')}
                >
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredItems.map(item => (
              <Card 
                key={item.id}
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  item.current_quantity <= 5 ? 'border-destructive/50' : ''
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {item.current_quantity <= 5 && (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="text-2xl font-bold">{item.current_quantity}</p>
                      <p className="text-xs text-muted-foreground">in stock</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Item Detail Dialog */}
        <ItemDetailDialog
          item={selectedItem}
          users={users}
          onClose={() => setSelectedItem(null)}
          onDelete={(item) => {
            setItemToDelete(item);
            setDeleteDialogOpen(true);
          }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{itemToDelete?.name}" and all its movement history.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

interface ItemDetailDialogProps {
  item: InventoryItem | null;
  users: { id: string; name: string }[];
  onClose: () => void;
  onDelete: (item: InventoryItem) => void;
}

function ItemDetailDialog({ item, users, onClose, onDelete }: ItemDetailDialogProps) {
  const { movements } = useStockMovements(item?.id);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">SKU</p>
              <p className="font-semibold">{item.sku}</p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="font-semibold text-2xl">{item.current_quantity}</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Created: {new Date(item.created_at).toLocaleDateString()}</p>
            <p>Last Updated: {new Date(item.updated_at).toLocaleDateString()}</p>
          </div>

          {/* Movement History */}
          <div>
            <h4 className="font-semibold mb-2">Recent Activity</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded</p>
              ) : (
                movements.slice(0, 10).map(movement => {
                  const user = users.find(u => u.id === movement.device_user_id);
                  return (
                    <div 
                      key={movement.id} 
                      className="flex justify-between items-center py-2 px-3 bg-muted rounded text-sm"
                    >
                      <div>
                        <span className={
                          movement.movement_type === 'add' 
                            ? 'text-green-600 font-semibold' 
                            : 'text-orange-600 font-semibold'
                        }>
                          {movement.movement_type === 'add' ? '+' : '-'}{movement.quantity}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          {movement.entry_method === 'ai_assisted' ? '(AI)' : '(Manual)'}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{user?.name || 'Unknown User'}</p>
                        <p>{new Date(movement.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
