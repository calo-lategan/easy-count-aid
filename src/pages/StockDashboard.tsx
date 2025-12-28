import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventoryItems, useStockMovements } from '@/hooks/useInventory';
import { useSupabaseMovements } from '@/hooks/useSupabaseMovements';
import { useCategories } from '@/hooks/useCategories';
import { ConditionBadge } from '@/components/stock/ConditionBadge';
import { 
  ArrowLeft, 
  Package, 
  FolderTree, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertOctagon
} from 'lucide-react';

interface InventoryItemExtended {
  id: string;
  name: string;
  sku: string;
  current_quantity: number;
  category_id?: string | null;
  condition?: 'new' | 'good' | 'damaged' | 'broken';
  low_stock_threshold?: number | null;
}

export default function StockDashboard() {
  const navigate = useNavigate();
  const { items } = useInventoryItems();
  const { movements: localMovements } = useStockMovements();
  const { movements: supabaseMovements } = useSupabaseMovements();
  const { categories, getCategoryPath } = useCategories();

  // Merge local and supabase movements (supabase takes priority for synced items)
  const movements = useMemo(() => {
    const movementMap = new Map<string, typeof supabaseMovements[0]>();
    
    // First add all supabase movements (server is source of truth)
    supabaseMovements.forEach(m => movementMap.set(m.id, m));
    
    // Then add local movements that aren't in supabase yet
    localMovements.forEach(m => {
      if (!movementMap.has(m.id)) {
        movementMap.set(m.id, m as any);
      }
    });
    
    return Array.from(movementMap.values());
  }, [localMovements, supabaseMovements]);

  // Calculate stock by category
  const stockByCategory = useMemo(() => {
    const categoryMap = new Map<string, { name: string; total: number; items: number }>();
    
    (items as InventoryItemExtended[]).forEach(item => {
      const categoryId = item.category_id || '00000000-0000-0000-0000-000000000000';
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category ? getCategoryPath(category.id) : 'Uncategorized';
      
      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, { name: categoryName, total: 0, items: 0 });
      }
      
      const entry = categoryMap.get(categoryId)!;
      entry.total += item.current_quantity;
      entry.items += 1;
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  }, [items, categories, getCategoryPath]);

  // Calculate stock by condition from actual inventory items (current stock)
  const stockByCondition = useMemo(() => {
    const conditions = { new: 0, good: 0, damaged: 0, broken: 0 };
    
    (items as InventoryItemExtended[]).forEach(item => {
      const condition = item.condition || 'good';
      if (condition in conditions) {
        conditions[condition as keyof typeof conditions] += item.current_quantity;
      }
    });

    return conditions;
  }, [items]);

  // Calculate broken stock quantity per item from movements
  const itemBrokenQuantities = useMemo(() => {
    const brokenByItem: Record<string, number> = {};
    
    movements.forEach(movement => {
      if (movement.condition === 'broken') {
        if (!brokenByItem[movement.item_id]) {
          brokenByItem[movement.item_id] = 0;
        }
        if (movement.movement_type === 'add') {
          brokenByItem[movement.item_id] += movement.quantity;
        } else {
          brokenByItem[movement.item_id] -= movement.quantity;
        }
      }
    });

    return brokenByItem;
  }, [movements]);

  // Top items by quantity
  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.current_quantity - a.current_quantity)
      .slice(0, 5);
  }, [items]);

  // Low stock items
  const lowStockItems = useMemo(() => {
    return items.filter(item => {
      const threshold = item.low_stock_threshold ?? 5;
      return item.current_quantity <= threshold;
    });
  }, [items]);

  // Items with broken stock (based on movements, not default condition)
  const brokenItems = useMemo(() => {
    return (items as InventoryItemExtended[])
      .filter(item => (itemBrokenQuantities[item.id] || 0) > 0)
      .map(item => ({
        ...item,
        brokenQuantity: itemBrokenQuantities[item.id] || 0
      }));
  }, [items, itemBrokenQuantities]);

  // Total stats
  const totalStock = items.reduce((sum, item) => sum + item.current_quantity, 0);
  const totalItems = items.length;

  const navigateToItem = (itemId: string) => {
    navigate(`/inventory?highlight=${itemId}`);
  };

  return (
    <AppLayout title="Stock Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
        </div>

        {/* Broken Items Alert */}
        {brokenItems.length > 0 && (
          <Card className="border-destructive bg-destructive/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" />
                Broken Items Alert ({stockByCondition.broken} total broken)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {brokenItems.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 bg-background rounded cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigateToItem(item.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-foreground hover:underline">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConditionBadge condition="broken" />
                      <span className="text-xl font-bold text-destructive">{item.brokenQuantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{totalStock}</p>
              <p className="text-sm text-muted-foreground">Total Stock</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{totalItems}</p>
              <p className="text-sm text-muted-foreground">Unique Items</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FolderTree className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-3xl font-bold">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
          <Card className={lowStockItems.length > 0 ? 'border-destructive' : ''}>
            <CardContent className="p-4 text-center">
              <TrendingDown className={`h-8 w-8 mx-auto mb-2 ${lowStockItems.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              <p className="text-3xl font-bold">{lowStockItems.length}</p>
              <p className="text-sm text-muted-foreground">Low Stock</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Stock by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Stock by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stockByCategory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No data available</p>
              ) : (
                <div className="space-y-3">
                  {stockByCategory.map((cat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cat.name}</p>
                        <p className="text-sm text-muted-foreground">{cat.items} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{cat.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock by Condition */}
          <Card>
            <CardHeader>
              <CardTitle>Stock by Condition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition="new" />
                    <span>New</span>
                  </div>
                  <span className="text-xl font-bold">{stockByCondition.new}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition="good" />
                    <span>Good</span>
                  </div>
                  <span className="text-xl font-bold">{stockByCondition.good}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition="damaged" />
                    <span>Damaged</span>
                  </div>
                  <span className="text-xl font-bold">{stockByCondition.damaged}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <ConditionBadge condition="broken" />
                    <span>Broken</span>
                  </div>
                  <span className="text-xl font-bold">{stockByCondition.broken}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Items by Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No items yet</p>
              ) : (
                <div className="space-y-3">
                  {topItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted p-2 rounded-lg transition-colors"
                      onClick={() => navigateToItem(item.id)}
                    >
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate hover:underline">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku}</p>
                      </div>
                      <span className="text-xl font-bold">{item.current_quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card className={lowStockItems.length > 0 ? 'border-destructive' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <TrendingDown className="h-5 w-5" />
                Low Stock Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">All items are well stocked</p>
              ) : (
                <div className="space-y-3">
                  {lowStockItems.slice(0, 5).map(item => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2 bg-destructive/10 rounded cursor-pointer hover:bg-destructive/20 transition-colors"
                      onClick={() => navigateToItem(item.id)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate hover:underline">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.sku}</p>
                      </div>
                      <span className="text-xl font-bold text-destructive">{item.current_quantity}</span>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{lowStockItems.length - 5} more items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}