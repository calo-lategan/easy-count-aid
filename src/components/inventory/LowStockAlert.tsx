import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, AlertOctagon } from 'lucide-react';
import { InventoryItem, StockMovement } from '@/lib/indexedDb';

interface LowStockAlertProps {
  items: InventoryItem[];
  movements?: StockMovement[];
  onItemClick?: (item: InventoryItem) => void;
}

export function LowStockAlert({ items, movements = [], onItemClick }: LowStockAlertProps) {
  // Filter items that are at or below their threshold
  const lowStockItems = items.filter(item => {
    const threshold = item.low_stock_threshold ?? 5;
    return item.current_quantity <= threshold;
  });

  // Items with negative stock
  const negativeStockItems = items.filter(item => item.current_quantity < 0);

  // Calculate broken stock per item from movements
  const brokenStockItems = useMemo(() => {
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

    // Filter items that have broken stock > 0
    return items
      .filter(item => (brokenByItem[item.id] || 0) > 0)
      .map(item => ({
        ...item,
        brokenQuantity: brokenByItem[item.id] || 0
      }));
  }, [items, movements]);

  if (lowStockItems.length === 0 && negativeStockItems.length === 0 && brokenStockItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Broken Stock Alert */}
      {brokenStockItems.length > 0 && (
        <Alert variant="destructive" className="border-destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>Broken Stock Alert!</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{brokenStockItems.length} item(s) have broken stock:</p>
            <div className="flex flex-wrap gap-2">
              {brokenStockItems.map(item => (
                <Badge 
                  key={item.id} 
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => onItemClick?.(item)}
                >
                  {item.name}: {item.brokenQuantity} broken
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {negativeStockItems.length > 0 && (
        <Alert variant="destructive">
          <TrendingDown className="h-4 w-4" />
          <AlertTitle>Negative Stock Alert!</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{negativeStockItems.length} item(s) have negative stock:</p>
            <div className="flex flex-wrap gap-2">
              {negativeStockItems.map(item => (
                <Badge 
                  key={item.id} 
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => onItemClick?.(item)}
                >
                  {item.name}: {item.current_quantity}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {lowStockItems.length > 0 && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-400">Low Stock Warning</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p className="mb-2">{lowStockItems.length} item(s) are at or below threshold:</p>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.slice(0, 10).map(item => (
                <Badge 
                  key={item.id} 
                  variant="outline"
                  className="cursor-pointer border-amber-500 text-amber-700 dark:text-amber-400"
                  onClick={() => onItemClick?.(item)}
                >
                  {item.name}: {item.current_quantity}/{item.low_stock_threshold ?? 5}
                </Badge>
              ))}
              {lowStockItems.length > 10 && (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                  +{lowStockItems.length - 10} more
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}