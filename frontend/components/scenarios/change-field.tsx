import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldConfig } from './change-field-config';

interface ChangeFieldProps {
  fieldName: string;
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Renders a single form field based on its configuration
 */
export function ChangeField({ fieldName, config, value, onChange }: ChangeFieldProps) {
  const { label, placeholder, type, options } = config;

  if (type === 'select' && options) {
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldName}>{label}</Label>
        <select
          id={fieldName}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldName}>{label}</Label>
      <Input
        id={fieldName}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
