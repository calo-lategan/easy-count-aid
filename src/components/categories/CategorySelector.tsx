import { useState, useMemo } from 'react';
import { useCategories } from '@/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function CategorySelector({ 
  value, 
  onChange, 
  label = 'Category',
  required = false,
  error
}: CategorySelectorProps) {
  const { categories, getCategoryPath } = useCategories();

  // Sort categories by path for better UX
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const pathA = getCategoryPath(a.id);
      const pathB = getCategoryPath(b.id);
      return pathA.localeCompare(pathB);
    });
  }, [categories, getCategoryPath]);

  return (
    <div className="space-y-2">
      {label && (
        <Label className={error ? 'text-destructive' : ''}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Select
        value={value || ''}
        onValueChange={(val) => onChange(val || null)}
      >
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {sortedCategories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {getCategoryPath(category.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}