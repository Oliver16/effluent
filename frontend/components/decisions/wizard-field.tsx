'use client'

import { UseFormReturn } from 'react-hook-form'
import { DecisionField } from '@/lib/types'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

interface WizardFieldProps {
  field: DecisionField
  form: UseFormReturn<Record<string, unknown>>
  watchValues: Record<string, unknown>
}

export function WizardField({ field, form, watchValues }: WizardFieldProps) {
  // Check showIf condition
  if (field.showIf && !watchValues[field.showIf]) {
    return null
  }

  const renderInput = () => {
    switch (field.type) {
      case 'currency':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      placeholder={field.placeholder || '0.00'}
                      className="pl-7"
                      {...formField}
                      value={formField.value as string || ''}
                      onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                </FormControl>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'percent':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min={field.min}
                      max={field.max}
                      placeholder={field.placeholder || '0'}
                      className="pr-7"
                      {...formField}
                      value={formField.value as string || ''}
                      onChange={(e) => formField.onChange(e.target.value ? Number(e.target.value) : '')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </FormControl>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'integer':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min={field.min}
                    max={field.max}
                    placeholder={field.placeholder || '0'}
                    {...formField}
                    value={formField.value as string || ''}
                    onChange={(e) => formField.onChange(e.target.value ? parseInt(e.target.value, 10) : '')}
                  />
                </FormControl>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'select':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value as string || field.default as string}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || 'Select...'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'date':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...formField}
                    value={formField.value as string || ''}
                  />
                </FormControl>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'toggle':
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={!!formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{field.label}</FormLabel>
                  {field.helperText && (
                    <FormDescription>{field.helperText}</FormDescription>
                  )}
                </div>
              </FormItem>
            )}
          />
        )

      case 'text':
      default:
        return (
          <FormField
            control={form.control}
            name={field.key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}{field.required && ' *'}</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={field.placeholder}
                    {...formField}
                    value={formField.value as string || ''}
                  />
                </FormControl>
                {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        )
    }
  }

  return renderInput()
}
