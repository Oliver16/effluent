'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Palette,
} from 'lucide-react'

const settingsItems: {
  title: string
  description: string
  href: '/settings/profile' | '/settings/household' | '/settings/billing' | '/settings/notifications' | '/settings/security' | '/settings/appearance'
  icon: React.ElementType
}[] = [
  {
    title: 'Profile',
    description: 'Manage your personal information',
    href: '/settings/profile',
    icon: User,
  },
  {
    title: 'Household',
    description: 'Edit household name, tax filing status, and members',
    href: '/settings/household',
    icon: Building2,
  },
  {
    title: 'Billing',
    description: 'Manage subscription and payment methods',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    title: 'Notifications',
    description: 'Configure email and in-app notifications',
    href: '/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Security',
    description: 'Password, two-factor authentication, sessions',
    href: '/settings/security',
    icon: Shield,
  },
  {
    title: 'Appearance',
    description: 'Theme, display preferences',
    href: '/settings/appearance',
    icon: Palette,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href as never}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
