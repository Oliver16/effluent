'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { households, profile as profileApi, settings as settingsApi, members } from '@/lib/api'
import { Household, UserProfile, UserSettings, UserSession, HouseholdMember } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { User, Home, Bell, Shield, Pencil, Trash2, Plus, Users, Copy, Check } from 'lucide-react'

const TAX_FILING_STATUS: Record<string, string> = {
  single: 'Single',
  married_jointly: 'Married Filing Jointly',
  married_separately: 'Married Filing Separately',
  head_of_household: 'Head of Household',
  qualifying_widow: 'Qualifying Widow(er)',
}

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
}

const RELATIONSHIPS: Record<string, string> = {
  self: 'Self',
  spouse: 'Spouse',
  partner: 'Partner',
  child: 'Child',
  parent: 'Parent',
  sibling: 'Sibling',
  other: 'Other',
}

const EMPLOYMENT_STATUSES: Record<string, string> = {
  employed: 'Employed',
  self_employed: 'Self-Employed',
  unemployed: 'Unemployed',
  retired: 'Retired',
  student: 'Student',
  homemaker: 'Homemaker',
  other: 'Other',
}

export default function SettingsPage() {
  const [householdData, setHouseholdData] = useState<Partial<Household>>({})
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({})
  const [notificationSettings, setNotificationSettings] = useState<Partial<UserSettings>>({})
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' })
  const [isSaved, setIsSaved] = useState(false)
  const [isProfileSaved, setIsProfileSaved] = useState(false)
  const [isPasswordUpdated, setIsPasswordUpdated] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  // Member editing state
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(null)
  const [memberForm, setMemberForm] = useState({
    name: '',
    relationship: 'self',
    employmentStatus: 'employed',
    dateOfBirth: '',
  })

  const queryClient = useQueryClient()

  const { data: householdList, isLoading } = useQuery({
    queryKey: ['households'],
    queryFn: () => households.list(),
  })

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileApi.get(),
  })

  const { data: notificationData, isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => settingsApi.getNotifications(),
  })

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => settingsApi.sessions(),
  })

  const { data: membersList, isLoading: isMembersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => members.list(),
  })

  const household = householdList?.[0]

  useEffect(() => {
    if (household) {
      setHouseholdData({
        name: household.name,
        currency: household.currency || 'USD',
        taxFilingStatus: household.taxFilingStatus || 'single',
        stateOfResidence: household.stateOfResidence || '',
      })
    }
  }, [household])

  useEffect(() => {
    if (profile) {
      setProfileData(profile)
    }
  }, [profile])

  useEffect(() => {
    if (notificationData) {
      setNotificationSettings(notificationData)
    }
  }, [notificationData])

  useEffect(() => {
    if (sessionsData) {
      setSessions(sessionsData)
    }
  }, [sessionsData])

  const updateHouseholdMutation = useMutation({
    mutationFn: (data: Partial<Household>) => {
      if (!household?.id) {
        return Promise.reject(new Error('No household available'))
      }
      return households.update(household.id, {
        name: data.name,
        currency: data.currency,
        tax_filing_status: data.taxFilingStatus,
        state_of_residence: data.stateOfResidence,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['households'] })
      setIsSaved(true)
      setTimeout(() => setIsSaved(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to update household:', error)
    },
  })

  const handleSave = () => {
    updateHouseholdMutation.mutate(householdData)
  }

  // Member mutations
  const createMemberMutation = useMutation({
    mutationFn: (data: Partial<HouseholdMember>) => members.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setMemberModalOpen(false)
      resetMemberForm()
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HouseholdMember> }) =>
      members.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setMemberModalOpen(false)
      setEditingMember(null)
      resetMemberForm()
    },
  })

  const deleteMemberMutation = useMutation({
    mutationFn: (id: string) => members.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  const resetMemberForm = () => {
    setMemberForm({
      name: '',
      relationship: 'self',
      employmentStatus: 'employed',
      dateOfBirth: '',
    })
  }

  const openMemberModal = (member?: HouseholdMember) => {
    if (member) {
      setEditingMember(member)
      setMemberForm({
        name: member.name || '',
        relationship: member.relationship || 'self',
        employmentStatus: member.employmentStatus || 'employed',
        dateOfBirth: member.dateOfBirth || '',
      })
    } else {
      setEditingMember(null)
      resetMemberForm()
    }
    setMemberModalOpen(true)
  }

  const handleMemberSave = () => {
    const data = {
      name: memberForm.name,
      relationship: memberForm.relationship,
      employmentStatus: memberForm.employmentStatus,
      dateOfBirth: memberForm.dateOfBirth || undefined,
    }

    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, data })
    } else {
      createMemberMutation.mutate(data)
    }
  }

  const updateNotificationsMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) => settingsApi.updateNotifications(data),
    onSuccess: (data) => {
      setNotificationSettings(data)
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
    },
    onError: (error) => {
      console.error('Failed to update notifications:', error)
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: () => profileApi.changePassword(passwordForm.current, passwordForm.next),
    onSuccess: () => {
      setPasswordForm({ current: '', next: '' })
      setIsPasswordUpdated(true)
      setTimeout(() => setIsPasswordUpdated(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to change password:', error)
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: () => profileApi.update({
      username: profileData.username,
      dateOfBirth: profileData.dateOfBirth,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsProfileSaved(true)
      setTimeout(() => setIsProfileSaved(false), 3000)
    },
    onError: (error) => {
      console.error('Failed to update profile:', error)
    },
  })

  const twoFactorMutation = useMutation({
    mutationFn: (enabled: boolean) => settingsApi.updateTwoFactor(enabled),
    onSuccess: (data) => {
      setNotificationSettings(data)
    },
    onError: (error) => {
      console.error('Failed to update two-factor settings:', error)
    },
  })

  const deleteAccountProfileMutation = useMutation({
    mutationFn: () => profileApi.delete(),
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('householdId')
        window.location.href = '/'
      }
    },
    onError: (error) => {
      console.error('Failed to delete account:', error)
    },
  })

  const handleNotificationToggle = (key: keyof UserSettings) => {
    const nextValue = !notificationSettings[key]
    const updated = { ...notificationSettings, [key]: nextValue }
    setNotificationSettings(updated)
    updateNotificationsMutation.mutate({ [key]: nextValue })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const data = await settingsApi.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'effluent-export.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading || isProfileLoading || isNotificationsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your household and account settings
        </p>
      </div>

      <Tabs defaultValue="household" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="household" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Household
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="household" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Household Information</CardTitle>
              <CardDescription>
                Update your household details and tax information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Household Name</Label>
                <Input
                  id="householdName"
                  value={householdData.name || ''}
                  onChange={(e) => setHouseholdData({ ...householdData, name: e.target.value })}
                  placeholder="e.g., The Smith Family"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="householdId">Household ID</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="householdId"
                    value={household?.id || ''}
                    readOnly
                    className="bg-muted font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (household?.id) {
                        navigator.clipboard.writeText(household.id)
                        setCopiedId(true)
                        setTimeout(() => setCopiedId(false), 2000)
                      }
                    }}
                  >
                    {copiedId ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this ID with family members so they can join your household during registration
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <select
                    id="currency"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={householdData.currency || 'USD'}
                    onChange={(e) => setHouseholdData({ ...householdData, currency: e.target.value })}
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxStatus">Tax Filing Status</Label>
                  <select
                    id="taxStatus"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={householdData.taxFilingStatus || 'single'}
                    onChange={(e) => setHouseholdData({ ...householdData, taxFilingStatus: e.target.value })}
                  >
                    {Object.entries(TAX_FILING_STATUS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State of Residence</Label>
                <select
                  id="state"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={householdData.stateOfResidence || ''}
                  onChange={(e) => setHouseholdData({ ...householdData, stateOfResidence: e.target.value })}
                >
                  <option value="">Select a state...</option>
                  {Object.entries(US_STATES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleSave} disabled={updateHouseholdMutation.isPending}>
                  {updateHouseholdMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                {isSaved && (
                  <span className="text-sm text-green-600">Changes saved successfully!</span>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Household Members</span>
                <Button onClick={() => openMemberModal()} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </CardTitle>
              <CardDescription>
                Manage the members of your household
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMembersLoading ? (
                <p className="text-muted-foreground">Loading members...</p>
              ) : !membersList?.length ? (
                <p className="text-muted-foreground py-4 text-center">
                  No household members configured. Add your first member.
                </p>
              ) : (
                <div className="space-y-4">
                  {membersList.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {member.isPrimary && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{RELATIONSHIPS[member.relationship] || member.relationship}</span>
                          <span>{EMPLOYMENT_STATUSES[member.employmentStatus] || member.employmentStatus}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMemberModal(member)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!member.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this household member?')) {
                                deleteMemberMutation.mutate(member.id)
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={profileData.username || ''}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="e.g., alexsmith"
                />
                <p className="text-xs text-muted-foreground">
                  This name appears in shared household views.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  disabled
                  value={profileData.email || ''}
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={profileData.dateOfBirth || ''}
                  onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Onboarding Status</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    household?.onboardingCompleted
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {household?.onboardingCompleted ? 'Complete' : 'In Progress'}
                  </span>
                  {!household?.onboardingCompleted && (
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <a href="/onboarding">Continue Onboarding</a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
                {isProfileSaved && (
                  <span className="text-sm text-green-600">Profile updated.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                      deleteAccountProfileMutation.mutate()
                    }
                  }}
                  disabled={deleteAccountProfileMutation.isPending}
                >
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekly Summary</p>
                  <p className="text-sm text-muted-foreground">
                    Receive a weekly summary of your financial health
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.weeklySummary}
                  onChange={() => handleNotificationToggle('weeklySummary')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Insight Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new insights are generated
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.insightAlerts}
                  onChange={() => handleNotificationToggle('insightAlerts')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Balance Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Monthly reminders to update account balances
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.balanceReminders}
                  onChange={() => handleNotificationToggle('balanceReminders')}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Critical Alerts</p>
                  <p className="text-sm text-muted-foreground">
                    Important alerts about your financial health
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!notificationSettings.criticalAlerts}
                  onChange={() => handleNotificationToggle('criticalAlerts')}
                  className="h-4 w-4 rounded"
                />
              </div>
              {updateNotificationsMutation.isPending && (
                <p className="text-sm text-muted-foreground">Updating preferences...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Change Password</p>
                  <p className="text-sm text-muted-foreground">
                    Update your account password
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Current"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                    className="h-9 w-36"
                  />
                  <Input
                    type="password"
                    placeholder="New"
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                    className="h-9 w-36"
                  />
                  <Button
                    variant="outline"
                    onClick={() => changePasswordMutation.mutate()}
                    disabled={changePasswordMutation.isPending || !passwordForm.current || passwordForm.next.length < 8}
                  >
                    {changePasswordMutation.isPending ? 'Saving...' : 'Change'}
                  </Button>
                </div>
              </div>
              {isPasswordUpdated && (
                <p className="text-sm text-green-600">Password updated successfully.</p>
              )}

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => twoFactorMutation.mutate(!notificationSettings.twoFactorEnabled)}
                >
                  {notificationSettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Active Sessions</p>
                  <p className="text-sm text-muted-foreground">
                    View and manage your active login sessions
                  </p>
                </div>
                <Button variant="outline" onClick={() => refetchSessions()}>
                  Refresh
                </Button>
              </div>
              {sessions.length > 0 && (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div key={session.id} className="rounded border p-3 text-sm">
                      <div className="font-medium">
                        {session.isCurrent ? 'Current Session' : 'Session'}
                      </div>
                      <div className="text-muted-foreground">
                        {session.ipAddress || 'Unknown IP'} · {session.userAgent || 'Unknown device'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>
                Manage your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your data
                  </p>
                </div>
                <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Member Edit Modal */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? 'Edit Household Member' : 'Add Household Member'}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? 'Update member details.'
                : 'Add a new member to your household.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="memberName">Name</Label>
              <Input
                id="memberName"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="e.g., John Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <select
                  id="relationship"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={memberForm.relationship}
                  onChange={(e) => setMemberForm({ ...memberForm, relationship: e.target.value })}
                >
                  {Object.entries(RELATIONSHIPS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <select
                  id="employmentStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={memberForm.employmentStatus}
                  onChange={(e) => setMemberForm({ ...memberForm, employmentStatus: e.target.value })}
                >
                  {Object.entries(EMPLOYMENT_STATUSES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberDob">Date of Birth (optional)</Label>
              <Input
                id="memberDob"
                type="date"
                value={memberForm.dateOfBirth}
                onChange={(e) => setMemberForm({ ...memberForm, dateOfBirth: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setMemberModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleMemberSave}
                disabled={
                  createMemberMutation.isPending ||
                  updateMemberMutation.isPending ||
                  !memberForm.name
                }
              >
                {(createMemberMutation.isPending || updateMemberMutation.isPending)
                  ? 'Saving...'
                  : editingMember
                  ? 'Save Changes'
                  : 'Add Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
