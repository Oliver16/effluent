'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Trash2, Plus, User } from 'lucide-react'
import type { StepProps } from './index'

interface Member {
  name: string
  relationship: string
  is_primary: boolean
  employment_status: string
}

const RELATIONSHIP_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'dependent', label: 'Other Dependent' },
]

const EMPLOYMENT_OPTIONS = [
  { value: 'employed_w2', label: 'W-2 Employee' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'both', label: 'Both W-2 and Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
]

export function MembersStep({ formData, setFormData, errors }: StepProps) {
  const members = (formData.members as Member[]) || []

  const addMember = () => {
    const newMembers = [...members, {
      name: '',
      relationship: members.length === 0 ? 'self' : 'spouse',
      is_primary: members.length === 0,
      employment_status: 'employed_w2',
    }]
    setFormData({ ...formData, members: newMembers })
  }

  const updateMember = (index: number, field: keyof Member, value: string | boolean) => {
    const newMembers = [...members]
    newMembers[index] = { ...newMembers[index], [field]: value }
    // If setting is_primary, unset others
    if (field === 'is_primary' && value === true) {
      newMembers.forEach((m, i) => {
        if (i !== index) m.is_primary = false
      })
    }
    setFormData({ ...formData, members: newMembers })
  }

  const removeMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index)
    setFormData({ ...formData, members: newMembers })
  }

  // Auto-add first member if empty
  if (members.length === 0) {
    addMember()
    return null
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add yourself and any household members whose finances you want to track together.
      </p>

      {members.map((member, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                {member.is_primary ? 'Primary Member' : `Member ${index + 1}`}
              </span>
            </div>
            {members.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeMember(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={member.name}
                onChange={(e) => updateMember(index, 'name', e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <Label>Relationship</Label>
              <Select
                value={member.relationship}
                onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                options={RELATIONSHIP_OPTIONS}
              />
            </div>

            <div>
              <Label>Employment Status</Label>
              <Select
                value={member.employment_status}
                onChange={(e) => updateMember(index, 'employment_status', e.target.value)}
                options={EMPLOYMENT_OPTIONS}
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={member.is_primary}
                  onChange={(e) => updateMember(index, 'is_primary', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Primary account holder</span>
              </label>
            </div>
          </div>
        </div>
      ))}

      {errors?.members && (
        <p className="text-sm text-red-500">{errors.members}</p>
      )}

      <Button variant="outline" onClick={addMember} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Another Member
      </Button>
    </div>
  )
}
