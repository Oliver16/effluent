'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Save, Plus, Trash2, User } from 'lucide-react'
import Link from 'next/link'
import { households, api } from '@/lib/api'
import type { Household, HouseholdMember } from '@/lib/types'

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married_jointly', label: 'Married Filing Jointly' },
  { value: 'married_separately', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
  { value: 'qualifying_widow', label: 'Qualifying Surviving Spouse' },
]

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
]

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

export default function HouseholdSettingsPage() {
  const [household, setHousehold] = useState<Partial<Household>>({
    name: '',
    taxFilingStatus: '',
    stateOfResidence: '',
  })
  const [members, setMembers] = useState<Partial<HouseholdMember>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadHousehold = useCallback(async () => {
    try {
      const householdId = localStorage.getItem('householdId')
      if (householdId) {
        const data = await households.get(householdId)
        setHousehold({
          id: data.id,
          name: data.name,
          taxFilingStatus: data.taxFilingStatus || '',
          stateOfResidence: data.stateOfResidence || '',
        })

        // Fetch members
        try {
          const membersData = await api.get<{ results: HouseholdMember[] }>('/api/v1/household-members/')
          setMembers(membersData.results || [])
        } catch {
          // Members endpoint might not exist yet
          setMembers([])
        }
      }
    } catch {
      setMessage('Failed to load household')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHousehold()
  }, [loadHousehold])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage('')
    try {
      const householdId = localStorage.getItem('householdId')
      if (householdId) {
        await api.patch(`/api/v1/households/${householdId}/`, {
          name: household.name,
          tax_filing_status: household.taxFilingStatus,
          state_of_residence: household.stateOfResidence,
        })
        setMessage('Household updated successfully')
      }
    } catch {
      setMessage('Failed to save household')
    } finally {
      setIsSaving(false)
    }
  }

  const addMember = () => {
    setMembers([...members, {
      name: '',
      relationship: 'spouse',
      isPrimary: false,
      employmentStatus: 'employed_w2',
    }])
  }

  const updateMember = (index: number, field: string, value: string | boolean) => {
    const newMembers = [...members]
    newMembers[index] = { ...newMembers[index], [field]: value }
    setMembers(newMembers)
  }

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Household Settings</h1>
          <p className="text-muted-foreground">Manage your household information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Household Details</CardTitle>
          <CardDescription>Basic information about your household</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Household Name</Label>
              <Input
                id="name"
                value={household.name || ''}
                onChange={(e) => setHousehold({ ...household, name: e.target.value })}
                placeholder="e.g., The Smith Family"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
          <CardDescription>Used for tax projections and calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="filing_status">Filing Status</Label>
              <Select
                id="filing_status"
                value={household.taxFilingStatus || ''}
                onChange={(e) => setHousehold({ ...household, taxFilingStatus: e.target.value })}
                options={FILING_STATUS_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State of Residence</Label>
              <Select
                id="state"
                value={household.stateOfResidence || ''}
                onChange={(e) => setHousehold({ ...household, stateOfResidence: e.target.value })}
                options={US_STATES}
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}

          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household Members</CardTitle>
          <CardDescription>People in your household for income and tax calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No household members added yet.
            </p>
          ) : (
            members.map((member, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">
                      {member.isPrimary ? 'Primary Member' : `Member ${index + 1}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMember(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={member.name || ''}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select
                      value={member.relationship || ''}
                      onChange={(e) => updateMember(index, 'relationship', e.target.value)}
                      options={RELATIONSHIP_OPTIONS}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    <Select
                      value={member.employmentStatus || ''}
                      onChange={(e) => updateMember(index, 'employmentStatus', e.target.value)}
                      options={EMPLOYMENT_OPTIONS}
                    />
                  </div>
                </div>
              </div>
            ))
          )}

          <Button variant="outline" onClick={addMember} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
