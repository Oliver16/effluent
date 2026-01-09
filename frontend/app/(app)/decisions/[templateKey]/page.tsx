'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { decisions } from '@/lib/api'
import { DecisionWizard } from '@/components/decisions/decision-wizard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function DecisionWizardPage() {
  const params = useParams()
  const router = useRouter()
  const templateKey = params.templateKey as string

  const { data: template, isLoading, isError, error } = useQuery({
    queryKey: ['decision-template', templateKey],
    queryFn: () => decisions.getTemplate(templateKey),
    enabled: !!templateKey,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading template...</div>
      </div>
    )
  }

  if (isError || !template) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Template not found</AlertTitle>
          <AlertDescription>
            The decision template &quot;{templateKey}&quot; could not be found.
            {error instanceof Error && ` Error: ${error.message}`}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground">{template.description}</p>
        </div>
      </div>

      <DecisionWizard template={template} />
    </div>
  )
}
