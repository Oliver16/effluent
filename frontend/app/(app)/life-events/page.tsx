'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { lifeEventTemplates } from '@/lib/api'
import { ControlListLayout } from '@/components/layout/ControlListLayout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SystemAlert } from '@/components/ui/SystemAlert'
import { TYPOGRAPHY, SURFACE } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Home,
  Heart,
  GraduationCap,
  Activity,
  DollarSign,
  Sunset,
  TrendingUp,
  UserMinus,
  Key,
  LogOut,
  Baby,
  UserX,
  CheckCircle,
  Car,
  Rocket,
  Gift,
  PiggyBank,
  Calendar,
  Loader2,
  CreditCard,
  ShoppingCart,
  RefreshCw,
  FileText,
  HeartPulse,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  career: <Briefcase className="h-5 w-5" />,
  housing: <Home className="h-5 w-5" />,
  family: <Heart className="h-5 w-5" />,
  education: <GraduationCap className="h-5 w-5" />,
  health: <Activity className="h-5 w-5" />,
  financial: <DollarSign className="h-5 w-5" />,
  retirement: <Sunset className="h-5 w-5" />,
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  briefcase: <Briefcase className="h-5 w-5" />,
  'trending-up': <TrendingUp className="h-5 w-5" />,
  'user-minus': <UserMinus className="h-5 w-5" />,
  home: <Home className="h-5 w-5" />,
  key: <Key className="h-5 w-5" />,
  'log-out': <LogOut className="h-5 w-5" />,
  baby: <Baby className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  'user-x': <UserX className="h-5 w-5" />,
  'graduation-cap': <GraduationCap className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  sunset: <Sunset className="h-5 w-5" />,
  'piggy-bank': <PiggyBank className="h-5 w-5" />,
  car: <Car className="h-5 w-5" />,
  rocket: <Rocket className="h-5 w-5" />,
  'credit-card': <CreditCard className="h-5 w-5" />,
  'shopping-cart': <ShoppingCart className="h-5 w-5" />,
  'refresh-cw': <RefreshCw className="h-5 w-5" />,
  'file-text': <FileText className="h-5 w-5" />,
  'heart-pulse': <HeartPulse className="h-5 w-5" />,
  gift: <Gift className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  calendar: <Calendar className="h-5 w-5" />,
}

export default function LifeEventsPage() {
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['life-event-templates'],
    queryFn: lifeEventTemplates.list,
  })

  const handleSelectTemplate = (templateName: string) => {
    // URL-encode the template name for the route
    const encodedName = encodeURIComponent(templateName)
    router.push(`/life-events/${encodedName}`)
  }

  if (isLoading) {
    return (
      <ControlListLayout
        title="Life Events"
        subtitle="Model major life changes and see their long-term financial impact"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ControlListLayout>
    )
  }

  if (isError) {
    return (
      <ControlListLayout
        title="Life Events"
        subtitle="Model major life changes and see their long-term financial impact"
      >
        <SystemAlert
          tone="critical"
          title="Error loading templates"
          description="Unable to load life event templates. Please try again later."
        />
      </ControlListLayout>
    )
  }

  const categoryGroups = data?.results || []

  return (
    <ControlListLayout
      title="Life Events"
      subtitle="Model major life changes and see their long-term financial impact"
    >
      <div className="space-y-10">
        {categoryGroups.map((group) => (
          <div key={group.category}>
            <div className="flex items-center gap-3 mb-5">
              <span className="p-2 bg-primary/10 rounded-lg text-primary">
                {CATEGORY_ICONS[group.category] || <Calendar className="h-5 w-5" />}
              </span>
              <h2 className={TYPOGRAPHY.sectionTitle}>{group.categoryDisplay}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.templates.map((template) => (
                <Card
                  key={template.name}
                  className={cn(
                    SURFACE.card,
                    'p-5 cursor-pointer hover:border-primary hover:shadow-md transition-all',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTemplate(template.name)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(template.name)}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-primary p-2 bg-primary/10 rounded-lg shrink-0">
                      {TEMPLATE_ICONS[template.icon] || <Calendar className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {template.suggestedChanges.slice(0, 2).map((change, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {change.name}
                          </Badge>
                        ))}
                        {template.suggestedChanges.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.suggestedChanges.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ControlListLayout>
  )
}
