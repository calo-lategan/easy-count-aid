import { Badge } from '@/components/ui/badge';

type ItemCondition = 'new' | 'good' | 'damaged' | 'broken';

interface ConditionBadgeProps {
  condition: ItemCondition;
}

export function ConditionBadge({ condition }: ConditionBadgeProps) {
  const variants: Record<ItemCondition, { label: string; className: string }> = {
    new: { 
      label: 'New', 
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
    },
    good: { 
      label: 'Good', 
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
    },
    damaged: { 
      label: 'Damaged', 
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' 
    },
    broken: { 
      label: 'Broken', 
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
    },
  };

  const { label, className } = variants[condition] || variants.good;

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}
