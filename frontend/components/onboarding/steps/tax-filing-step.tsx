'use client'

import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { StepProps } from './index'

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_widow', label: 'Qualifying Surviving Spouse' },
]

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]

export function TaxFilingStep({ formData, setFormData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Your tax filing status helps us calculate tax withholdings and project your after-tax income more accurately.
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="filing_status">Filing Status</Label>
          <Select
            id="filing_status"
            value={(formData.filing_status as string) || ''}
            onChange={(e) => setFormData({ ...formData, filing_status: e.target.value })}
            options={FILING_STATUS_OPTIONS}
          />
          {errors?.filing_status && (
            <p className="text-sm text-red-500 mt-1">{errors.filing_status}</p>
          )}
        </div>

        <div>
          <Label htmlFor="state">State of Residence</Label>
          <Select
            id="state"
            value={(formData.state as string) || ''}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            options={US_STATES}
          />
          {errors?.state && (
            <p className="text-sm text-red-500 mt-1">{errors.state}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            Used to calculate state income tax estimates
          </p>
        </div>
      </div>
    </div>
  )
}
