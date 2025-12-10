import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInventoryItems, useStockMovements, useDeviceUsers } from '@/hooks/useInventory';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Search, Package, Plus, AlertTriangle, Trash2, Pencil, TrendingDown } from 'lucide-react';
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
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { ItemEditDialog } from '@/components/inventory/ItemEditDialog';
import { LowStockAlert } from '@/components/inventory/LowStockAlert';
import { ConditionBadge } from '@/components/stock/ConditionBadge';
import { Badge } from '@/components/ui/badge';

export default function InventoryList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, deleteItem, updateItem } = useInventoryItems();
  const { users } = useDeviceUsers();
  const { categories, getCategoryPath } = useCategories();
  const { isAdmin } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);

  const filteredItems = items.filter(item => {
    // Search filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    
    // Condition filter
    const matchesCondition = !selectedCondition || item.condition === selectedCondition;
    
    return matchesSearch && matchesCategory && matchesCondition;
  });

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

  const handleEditSave = async (updates: Partial<InventoryItem>) => {
    if (!itemToEdit) return;
    
    await updateItem(itemToEdit.id, updates);
    toast({
      title: 'Item Updated',
      description: `${updates.name || itemToEdit.name} has been updated.`,
    });
  };

  const isLowStock = (item: InventoryItem) => {
    const threshold = item.low_stock_threshold ?? 5;
    return item.current_quantity <= threshold;
  };

  const isNegativeStock = (item: InventoryItem) => {
    return item.current_quantity < 0;
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

        {/* Low Stock Alerts */}
        <LowStockAlert 
          items={items}
          onItemClick={(item) => {
            setItemToEdit(item);
            setEditDialogOpen(true);
          }}
        />

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

        {/* Filters */}
        <InventoryFilters
          categories={categories}
          selectedCategory={selectedCategory}
          selectedCondition={selectedCondition}
          onCategoryChange={setSelectedCategory}
          onConditionChange={setSelectedCondition}
        />

        {/* Items List */}
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery || selectedCategory || selectedCondition 
                    ? 'No items match your filters' 
                    : 'No items in inventory'}
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
                  isNegativeStock(item) ? 'border-destructive' : isLowStock(item) ? 'border-amber-500' : ''
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {item.reference_image_url ? (
                        <img 
                          src={item.reference_image_url} 
                          alt={item.name}
                          className="h-12 w-12 object-cover rounded-lg border"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-semibold text-lg">{item.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>SKU: {item.sku}</span>
                          {item.category_id && (
                            <Badge variant="outline" className="text-xs">
                              {getCategoryPath(item.category_id)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      {isNegativeStock(item) && (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      )}
                      {isLowStock(item) && !isNegativeStock(item) && (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                      <div>
                        <p className={`text-2xl font-bold ${
                          isNegativeStock(item) ? 'text-destructive' : 
                          isLowStock(item) ? 'text-amber-500' : ''
                        }`}>
                          {item.current_quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          threshold: {item.low_stock_threshold ?? 5}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {item.condition && <ConditionBadge condition={item.condition} />}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="ml-auto gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToEdit(item);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
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
          categories={categories}
          getCategoryPath={getCategoryPath}
          onClose={() => setSelectedItem(null)}
          onDelete={(item) => {
            setItemToDelete(item);
            setDeleteDialogOpen(true);
          }}
          onEdit={(item) => {
            setItemToEdit(item);
            setEditDialogOpen(true);
            setSelectedItem(null);
          }}
          isAdmin={isAdmin}
        />

        {/* Edit Dialog */}
        <ItemEditDialog
          item={itemToEdit}
          categories={categories}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleEditSave}
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
  categories: { id: string; name: string }[];
  getCategoryPath: (id: string) => string;
  onClose: () => void;
  onDelete: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  isAdmin: boolean;
}

function ItemDetailDialog({ item, users, categories, getCategoryPath, onClose, onDelete, onEdit, isAdmin }: ItemDetailDialogProps) {
  const { movements } = useStockMovements(item?.id);

  if (!item) return null;

  // Calculate quantity breakdown by condition
  const conditionBreakdown = movements.reduce((acc, movement) => {
    const condition = movement.condition || 'good';
    if (!acc[condition]) acc[condition] = 0;
    
    if (movement.movement_type === 'add') {
      acc[condition] += movement.quantity;
    } else {
      acc[condition] -= movement.quantity;
    }
    return acc;
  }, {} as Record<string, number>);

  // Filter out zero or negative quantities
  const activeConditions = Object.entries(conditionBreakdown).filter(([_, qty]) => qty > 0);

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
              <p className="text-sm text-muted-foreground">Total Stock</p>
              <p className={`font-semibold text-2xl ${item.current_quantity < 0 ? 'text-destructive' : ''}`}>
                {item.current_quantity}
              </p>
            </div>
          </div>

          {/* Quantity Breakdown by Condition */}
          {activeConditions.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Stock by Condition</p>
              <div className="flex flex-wrap gap-2">
                {activeConditions.map(([condition, qty]) => (
                  <div key={condition} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-md">
                    <ConditionBadge condition={condition as 'new' | 'good' | 'damaged' | 'broken'} />
                    <span className="font-semibold">{qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-semibold">
                {item.category_id ? getCategoryPath(item.category_id) : 'Uncategorized'}
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Default Condition</p>
              {item.condition && <ConditionBadge condition={item.condition} />}
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Low Stock Threshold</p>
            <p className="font-semibold">{item.low_stock_threshold ?? 5}</p>
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
                      <div className="flex items-center gap-2">
                        <span className={
                          movement.movement_type === 'add' 
                            ? 'text-green-600 font-semibold' 
                            : 'text-orange-600 font-semibold'
                        }>
                          {movement.movement_type === 'add' ? '+' : '-'}{movement.quantity}
                        </span>
                        {movement.condition && (
                          <ConditionBadge condition={movement.condition} />
                        )}
                        <span className="text-muted-foreground">
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onEdit(item)}
            >
              <Pencil className="h-4 w-4" />
              Edit Item
            </Button>
            {isAdmin && (
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Item
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}