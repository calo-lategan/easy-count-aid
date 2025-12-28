import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Category } from '@/hooks/useCategories';

interface InventoryFiltersProps {
  categories: Category[];
  selectedCategory: string | null;
  selectedCondition: string | null;
  onCategoryChange: (value: string | null) => void;
  onConditionChange: (value: string | null) => void;
  getCategoryPath?: (id: string) => string;
}

export function InventoryFilters({
  categories,
  selectedCategory,
  selectedCondition,
  onCategoryChange,
  onConditionChange,
  getCategoryPath,
}: InventoryFiltersProps) {
  const hasFilters = selectedCategory || selectedCondition;

  // Build hierarchical category list with indentation
  const hierarchicalCategories = useMemo(() => {
    // Get depth of a category
    const getDepth = (catId: string): number => {
      const cat = categories.find(c => c.id === catId);
      if (!cat || !cat.parent_id) return 0;
      return 1 + getDepth(cat.parent_id);
    };

    // Sort categories by their full path for proper grouping
    return categories
      .map(cat => ({
        ...cat,
        depth: getDepth(cat.id),
        fullPath: getCategoryPath ? getCategoryPath(cat.id) : cat.name,
      }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath));
  }, [categories, getCategoryPath]);

  // Get display name for selected category
  const selectedCategoryDisplay = useMemo(() => {
    if (!selectedCategory) return null;
    if (getCategoryPath) return getCategoryPath(selectedCategory);
    return categories.find(c => c.id === selectedCategory)?.name;
  }, [selectedCategory, categories, getCategoryPath]);

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <Select 
          value={selectedCategory || 'all'} 
          onValueChange={(value) => onCategoryChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {hierarchicalCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span style={{ paddingLeft: `${cat.depth * 16}px` }} className="flex items-center gap-1">
                  {cat.depth > 0 && <span className="text-muted-foreground">└</span>}
                  {cat.fullPath}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedCondition || 'all'} 
          onValueChange={(value) => onConditionChange(value === 'all' ? null : value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Conditions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="good">Good</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
            <SelectItem value="broken">Broken</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              onCategoryChange(null);
              onConditionChange(null);
            }}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {hasFilters && (
        <div className="flex gap-2 flex-wrap">
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              Category: {selectedCategoryDisplay}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onCategoryChange(null)}
              />
            </Badge>
          )}
          {selectedCondition && (
            <Badge variant="secondary" className="gap-1 capitalize">
              Condition: {selectedCondition}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => onConditionChange(null)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}