'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, Briefcase } from 'lucide-react'
import type { StepProps } from './index'

interface IncomeSource {
  name: string
  income_type: string
  salary: string
  frequency: string
}

const INCOME_TYPE_OPTIONS = [
  { value: 'w2', label: 'W-2 Employment' },
  { value: 'self_employed', label: 'Self-Employment' },
  { value: 'freelance', label: 'Freelance/Contract' },
  { value: 'rental', label: 'Rental Income' },
  { value: 'investment', label: 'Investment Income' },
  { value: 'social_security', label: 'Social Security' },
  { value: 'pension', label: 'Pension' },
  { value: 'other', label: 'Other Income' },
]

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'semimonthly', label: 'Twice a Month' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
]

export function IncomeSourcesStep({ formData, setFormData, errors }: StepProps) {
  const sources = (formData.sources as IncomeSource[]) || []

  const addSource = () => {
    const newSources = [...sources, {
      name: '',
      income_type: 'w2',
      salary: '',
      frequency: 'biweekly',
    }]
    setFormData({ ...formData, sources: newSources })
  }

  const updateSource = (index: number, field: keyof IncomeSource, value: string) => {
    const newSources = [...sources]
    newSources[index] = { ...newSources[index], [field]: value }
    setFormData({ ...formData, sources: newSources })
  }

  const removeSource = (index: number) => {
    const newSources = sources.filter((_, i) => i !== index)
    setFormData({ ...formData, sources: newSources })
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add your sources of income. This includes jobs, side gigs, rental properties, and any other regular income.
      </p>

      {sources.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No income sources added yet</p>
          <Button onClick={addSource}>
            <Plus className="h-4 w-4 mr-2" />
            Add Income Source
          </Button>
        </div>
      ) : (
        <>
          {sources.map((source, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Income Source {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSource(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Source Name</Label>
                  <Input
                    value={source.name}
                    onChange={(e) => updateSource(index, 'name', e.target.value)}
                    placeholder="e.g., ACME Corp, Freelance Design"
                  />
                  {errors?.[`sources.${index}.name`] && (
                    <p className="text-sm text-red-500 mt-1">{errors[`sources.${index}.name`]}</p>
                  )}
                </div>

                <div>
                  <Label>Income Type</Label>
                  <Select
                    value={source.income_type}
                    onChange={(e) => updateSource(index, 'income_type', e.target.value)}
                    options={INCOME_TYPE_OPTIONS}
                  />
                </div>

                <div>
                  <Label>Gross Annual Income</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={source.salary}
                      onChange={(e) => updateSource(index, 'salary', e.target.value)}
                      placeholder="85000"
                      className="pl-7"
                    />
                  </div>
                </div>

                <div>
                  <Label>Pay Frequency</Label>
                  <Select
                    value={source.frequency}
                    onChange={(e) => updateSource(index, 'frequency', e.target.value)}
                    options={FREQUENCY_OPTIONS}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addSource} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Another Income Source
          </Button>
        </>
      )}
    </div>
  )
}
