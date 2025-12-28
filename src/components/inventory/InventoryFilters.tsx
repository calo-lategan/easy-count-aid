import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { Category } from '@/hooks/useCategories';
import { HierarchicalCategoryFilter } from './HierarchicalCategoryFilter';

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

  const selectedCategoryDisplay = selectedCategory && getCategoryPath 
    ? getCategoryPath(selectedCategory) 
    : categories.find(c => c.id === selectedCategory)?.name;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        <HierarchicalCategoryFilter
          categories={categories}
          value={selectedCategory}
          onChange={onCategoryChange}
          getCategoryPath={getCategoryPath}
        />

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