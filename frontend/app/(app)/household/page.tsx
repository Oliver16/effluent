'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { households, api } from '@/lib/api'
import { User, Settings, Building2 } from 'lucide-react'
import Link from 'next/link'
import type { Household, HouseholdMember } from '@/lib/types'

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const householdId = localStorage.getItem('householdId')
      if (householdId) {
        const data = await households.get(householdId)
        setHousehold(data)

        try {
          const membersData = await api.get<{ results: HouseholdMember[] }>('/api/v1/household-members/')
          setMembers(membersData.results || [])
        } catch {
          setMembers([])
        }
      }
    } catch {
      // Handle error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Household</h1>
          <p className="text-muted-foreground">Your household information</p>
        </div>
        <Link href="/settings/household">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Edit Settings
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Household Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Household Name</p>
              <p className="font-medium">{household?.name || 'Not set'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tax Filing Status</p>
              <p className="font-medium capitalize">
                {household?.taxFilingStatus?.replace(/_/g, ' ') || 'Not set'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">State of Residence</p>
              <p className="font-medium">{household?.stateOfResidence || 'Not set'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{household?.currency || 'USD'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Household Members
            </CardTitle>
            <CardDescription>People in your household</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No members added yet
              </p>
            ) : (
              members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {member.relationship} - {member.employmentStatus?.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  {member.isPrimary && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Primary
                    </span>
                  )}
                </div>
              ))
            )}

            <Link href="/settings/household" className="block">
              <Button variant="outline" className="w-full">
                Manage Members
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
