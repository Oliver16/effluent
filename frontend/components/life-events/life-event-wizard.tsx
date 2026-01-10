'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lifeEventTemplates, scenarios, incomeSources, flows } from '@/lib/api'
import { LifeEventTemplate, SuggestedChange, IncomeSourceDetail, RecurringFlow } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Check, ChevronLeft, ChevronRight, Loader2, Calendar, CheckCircle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LifeEventWizardProps {
  template: LifeEventTemplate
}

interface ChangeValue {
  _skip: boolean
  source_flow_id?: string
  [key: string]: unknown
}

interface WizardResult {
  scenarioId: string
  scenarioName: string
  changesApplied: number
}

export function LifeEventWizard({ template }: LifeEventWizardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [scenarioName, setScenarioName] = useState(
    `${template.name} - ${new Date().toLocaleDateString()}`
  )
  const [changeValues, setChangeValues] = useState<Record<string, ChangeValue>>(() => {
    // Initialize change values from template
    const values: Record<string, ChangeValue> = {}
    template.suggestedChanges.forEach((change, idx) => {
      values[String(idx)] = {
        _skip: !change.isRequired,
        ...change.parametersTemplate,
      }
    })
    return values
  })
  const [result, setResult] = useState<WizardResult | null>(null)

  // Steps: 1. Overview & Date, 2. Configure Changes, 3. Review & Create
  const steps = [
    { id: 'overview', title: 'Overview', description: 'Set when this change takes effect' },
    { id: 'changes', title: 'Configure Changes', description: 'Customize the financial changes' },
    { id: 'review', title: 'Review & Create', description: 'Review and create your scenario' },
  ]

  // Fetch income sources for source flow selection
  const { data: incomeSourcesData } = useQuery({
    queryKey: ['income-sources'],
    queryFn: incomeSources.list,
    enabled: template.suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'income'),
  })

  // Fetch expense flows for source flow selection
  const { data: flowsData } = useQuery({
    queryKey: ['flows'],
    queryFn: flows.list,
    enabled: template.suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'expense'),
  })

  const availableIncomeSources = useMemo(() => {
    if (!incomeSourcesData) return []
    return incomeSourcesData.map((source: IncomeSourceDetail) => ({
      id: `income_source_${source.id}`,
      name: source.name || 'Income Source',
      amount: parseFloat(source.grossAnnualSalary || source.grossAnnual || '0'),
    }))
  }, [incomeSourcesData])

  const availableExpenseFlows = useMemo(() => {
    if (!flowsData) return []
    return flowsData
      .filter((flow: RecurringFlow) => flow.flowType === 'expense')
      .map((flow: RecurringFlow) => ({
        id: flow.id,
        name: flow.name,
        amount: parseFloat(String(flow.amount || '0')),
      }))
  }, [flowsData])

  // Create scenario and apply life event
  const createMutation = useMutation({
    mutationFn: async () => {
      // First, create a new scenario
      const scenario = await scenarios.create({
        name: scenarioName,
        description: `Created from life event: ${template.name}`,
      })

      // Then apply the life event template to the scenario
      await lifeEventTemplates.apply(template.name, {
        scenarioId: scenario.id,
        effectiveDate: effectiveDate,
        changeValues: changeValues,
      })

      // Count how many changes were applied
      const changesApplied = Object.values(changeValues).filter(v => !v._skip).length

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        changesApplied,
      }
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      toast.success('Scenario created!', {
        description: `"${data.scenarioName}" is ready to analyze.`,
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to create scenario', {
        description: error.message,
      })
    },
  })

  const handleChangeValue = (changeIdx: number, field: string, value: unknown) => {
    setChangeValues((prev) => ({
      ...prev,
      [String(changeIdx)]: {
        ...prev[String(changeIdx)],
        [field]: value,
      },
    }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    createMutation.mutate()
  }

  const selectedChangesCount = Object.values(changeValues).filter(v => !v._skip).length

  // Show results if we have them
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Scenario Created</CardTitle>
            <CardDescription className="text-base">
              Your life event scenario is ready to analyze
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scenario Name</span>
                <span className="font-medium">{result.scenarioName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Changes Applied</span>
                <span className="font-medium">{result.changesApplied} changes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Date</span>
                <span className="font-medium">{new Date(effectiveDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/life-events')}
              >
                Model Another Event
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push(`/scenarios/${result.scenarioId}`)}
              >
                View Scenario
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Stepper sidebar */}
      <div className="lg:w-64 flex-shrink-0">
        <nav className="space-y-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep
            const isCurrent = index === currentStep

            return (
              <button
                key={step.id}
                onClick={() => index <= currentStep && setCurrentStep(index)}
                disabled={index > currentStep || createMutation.isPending}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                  isCurrent && 'bg-primary/10 text-primary',
                  isCompleted && 'text-muted-foreground hover:bg-accent',
                  !isCurrent && !isCompleted && 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isCurrent && 'bg-primary text-primary-foreground',
                    isCompleted && 'bg-green-500 text-white',
                    !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Form area */}
      <div className="flex-1">
        {/* Step 1: Overview */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>When will this happen?</CardTitle>
              <CardDescription>
                Set the effective date for {template.name.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Effective Date</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  The date when these changes will start affecting your finances
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenarioName">Scenario Name</Label>
                <Input
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="Enter a name for this scenario"
                />
                <p className="text-sm text-muted-foreground">
                  A descriptive name to help you identify this scenario later
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">This event includes:</h4>
                <div className="flex flex-wrap gap-2">
                  {template.suggestedChanges.map((change, idx) => (
                    <Badge key={idx} variant={change.isRequired ? 'default' : 'secondary'}>
                      {change.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure Changes */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Changes</CardTitle>
              <CardDescription>
                Customize which changes to include and their values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {template.suggestedChanges.map((change, idx) => (
                    <Card
                      key={idx}
                      className={cn(
                        'transition-opacity',
                        changeValues[String(idx)]?._skip && 'opacity-50'
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`change-${idx}`}
                              checked={!changeValues[String(idx)]?._skip}
                              onCheckedChange={(checked) =>
                                handleChangeValue(idx, '_skip', !checked)
                              }
                              disabled={change.isRequired}
                            />
                            <Label htmlFor={`change-${idx}`} className="font-medium cursor-pointer">
                              {change.name}
                            </Label>
                            {change.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="ml-6">{change.description}</CardDescription>
                      </CardHeader>

                      {!changeValues[String(idx)]?._skip && (
                        <CardContent className="pt-0 ml-6">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {/* Source flow selector */}
                            {change.requiresSourceFlow && (
                              <div className="space-y-1 sm:col-span-2">
                                <Label className="text-sm">
                                  {change.sourceFlowType === 'income' ? 'Select Income Source' : 'Select Expense'}
                                  <span className="text-destructive ml-1">*</span>
                                </Label>
                                <Select
                                  value={changeValues[String(idx)]?.source_flow_id as string || ''}
                                  onValueChange={(value) => handleChangeValue(idx, 'source_flow_id', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Choose ${change.sourceFlowType}...`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(change.sourceFlowType === 'income' ? availableIncomeSources : availableExpenseFlows).map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name} {item.amount > 0 && `($${Number(item.amount).toLocaleString()}/yr)`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {/* Dynamic parameter fields */}
                            {Object.entries(change.parametersTemplate).map(([key, defaultValue]) => {
                              if (key === '_skip') return null

                              const value = changeValues[String(idx)]?.[key] ?? defaultValue
                              const label = key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, (c) => c.toUpperCase())

                              // Determine input type
                              const isNumeric =
                                key.includes('amount') ||
                                key.includes('payment') ||
                                key.includes('principal') ||
                                key.includes('value') ||
                                key.includes('costs') ||
                                key.includes('price') ||
                                key.includes('rate') ||
                                key.includes('percentage') ||
                                key.includes('months') ||
                                key.includes('term')

                              return (
                                <div key={key} className="space-y-1">
                                  <Label className="text-sm">{label}</Label>
                                  <Input
                                    type={isNumeric ? 'number' : 'text'}
                                    value={String(value)}
                                    onChange={(e) => {
                                      const newValue = isNumeric
                                        ? parseFloat(e.target.value) || 0
                                        : e.target.value
                                      handleChangeValue(idx, key, newValue)
                                    }}
                                    placeholder={`Enter ${label.toLowerCase()}`}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Scenario</CardTitle>
              <CardDescription>
                Confirm the details before creating your scenario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Life Event</span>
                  <span className="font-medium">{template.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Scenario Name</span>
                  <span className="font-medium">{scenarioName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Effective Date</span>
                  <span className="font-medium">{new Date(effectiveDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Changes to Apply</span>
                  <span className="font-medium">{selectedChangesCount} of {template.suggestedChanges.length}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Selected Changes:</h4>
                <div className="space-y-2">
                  {template.suggestedChanges.map((change, idx) => {
                    if (changeValues[String(idx)]?._skip) return null
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{change.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || createMutation.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || selectedChangesCount === 0}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Scenario'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
