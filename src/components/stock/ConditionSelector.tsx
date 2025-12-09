import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type ItemCondition = 'new' | 'good' | 'damaged' | 'broken';

interface ConditionSelectorProps {
  value: ItemCondition;
  onChange: (value: ItemCondition) => void;
  label?: string;
}

export function ConditionSelector({ value, onChange, label = 'Condition' }: ConditionSelectorProps) {
  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as ItemCondition)}
        className="flex flex-wrap gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="new" id="new" />
          <Label htmlFor="new" className="text-blue-600 dark:text-blue-400 cursor-pointer">
            New
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="good" id="good" />
          <Label htmlFor="good" className="text-green-600 dark:text-green-400 cursor-pointer">
            Good
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="damaged" id="damaged" />
          <Label htmlFor="damaged" className="text-yellow-600 dark:text-yellow-400 cursor-pointer">
            Damaged
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="broken" id="broken" />
          <Label htmlFor="broken" className="text-red-600 dark:text-red-400 cursor-pointer">
            Broken
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
