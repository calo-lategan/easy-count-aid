import { Button } from '@/components/ui/button';
import { Delete } from 'lucide-react';

interface NumberPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export function NumberPad({ value, onChange, maxLength = 6 }: NumberPadProps) {
  const handlePress = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
        <Button
          key={num}
          variant="outline"
          className="h-16 text-2xl font-bold"
          onClick={() => handlePress(num.toString())}
        >
          {num}
        </Button>
      ))}
      <Button
        variant="outline"
        className="h-16 text-lg"
        onClick={handleClear}
      >
        Clear
      </Button>
      <Button
        variant="outline"
        className="h-16 text-2xl font-bold"
        onClick={() => handlePress('0')}
      >
        0
      </Button>
      <Button
        variant="outline"
        className="h-16"
        onClick={handleBackspace}
      >
        <Delete className="h-6 w-6" />
      </Button>
    </div>
  );
}
