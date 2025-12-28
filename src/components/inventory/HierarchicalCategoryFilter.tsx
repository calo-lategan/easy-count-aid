import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Category } from '@/hooks/useCategories';

interface HierarchicalCategoryFilterProps {
  categories: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
  getCategoryPath?: (id: string) => string;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number;
}

export function HierarchicalCategoryFilter({
  categories,
  value,
  onChange,
  getCategoryPath,
}: HierarchicalCategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure
  const categoryTree = useMemo(() => {
    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    categories.forEach(cat => {
      nodeMap.set(cat.id, { ...cat, children: [], depth: 0 });
    });

    categories.forEach(cat => {
      const node = nodeMap.get(cat.id)!;
      if (cat.parent_id && nodeMap.has(cat.parent_id)) {
        const parent = nodeMap.get(cat.parent_id)!;
        node.depth = parent.depth + 1;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortNodes = (nodes: CategoryNode[]) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name));
      nodes.forEach(node => sortNodes(node.children));
    };
    sortNodes(roots);

    return roots;
  }, [categories]);

  // Auto-expand parents of selected value
  useMemo(() => {
    if (value) {
      const newExpanded = new Set<string>();
      let current = categories.find(c => c.id === value);
      while (current?.parent_id) {
        newExpanded.add(current.parent_id);
        current = categories.find(c => c.id === current!.parent_id);
      }
      if (newExpanded.size > 0) {
        setExpandedIds(prev => new Set([...prev, ...newExpanded]));
      }
    }
  }, [value, categories]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (categoryId: string | null) => {
    onChange(categoryId);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "All Categories";
    if (getCategoryPath) return getCategoryPath(value);
    return categories.find(c => c.id === value)?.name || "All Categories";
  };

  const renderNode = (node: CategoryNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isSelected = value === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
          onClick={() => handleSelect(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <span className="flex-1 text-sm">{node.name}</span>
          {isSelected && <Check className="h-4 w-4" />}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-[280px] justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent",
              !value && "bg-accent"
            )}
            onClick={() => handleSelect(null)}
          >
            <span className="w-5" />
            <span className="flex-1 text-sm">All Categories</span>
            {!value && <Check className="h-4 w-4" />}
          </div>
          {categoryTree.map(node => renderNode(node))}
        </div>
      </PopoverContent>
    </Popover>
  );
}