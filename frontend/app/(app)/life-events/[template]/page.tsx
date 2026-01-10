'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { lifeEventTemplates } from '@/lib/api'
import { LifeEventWizard } from '@/components/life-events/life-event-wizard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function LifeEventWizardPage() {
  const params = useParams()
  const router = useRouter()
  const templateName = decodeURIComponent(params.template as string)

  const { data: templatesData, isLoading, isError } = useQuery({
    queryKey: ['life-event-templates'],
    queryFn: lifeEventTemplates.list,
  })

  // Find the template by name
  const template = templatesData?.results
    ?.flatMap(group => group.templates)
    .find(t => t.name === templateName)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !template) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/life-events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Life Events
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Template not found</AlertTitle>
          <AlertDescription>
            The life event template &quot;{templateName}&quot; could not be found.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/life-events')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground">{template.description}</p>
        </div>
      </div>

      <LifeEventWizard template={template} />
    </div>
  )
}
