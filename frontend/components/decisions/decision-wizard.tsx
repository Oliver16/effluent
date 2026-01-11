'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { decisions, accounts as accountsApi } from '@/lib/api'
import { DecisionTemplate, DecisionStep, DecisionField, DecisionRunResponse, Account } from '@/lib/types'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScenarioPicker } from '@/components/scenarios/scenario-picker'
import { WizardField } from './wizard-field'
import { DecisionResults } from './decision-results'
import { Check, ChevronLeft, ChevronRight, Loader2, GitBranch, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type ScenarioMode = 'create' | 'append'

interface DecisionWizardProps {
  template: DecisionTemplate
}

// Build Zod schema dynamically from template fields
function buildSchema(steps: DecisionStep[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const step of steps) {
    for (const field of step.fields) {
      let fieldSchema: z.ZodTypeAny

      switch (field.type) {
        case 'currency':
        case 'percent':
        case 'integer':
          fieldSchema = z.union([z.number(), z.string().transform(v => v === '' ? undefined : Number(v))])
          if (field.required) {
            fieldSchema = z.number({ required_error: `${field.label} is required` })
          } else {
            fieldSchema = z.number().optional()
          }
          break
        case 'toggle':
          fieldSchema = z.boolean().default(field.default as boolean || false)
          break
        case 'date':
          if (field.required) {
            fieldSchema = z.string().min(1, `${field.label} is required`)
          } else {
            fieldSchema = z.string().optional()
          }
          break
        case 'select':
        case 'text':
        case 'account_select':
        case 'debt_select':
        case 'asset_select':
        default:
          if (field.required) {
            fieldSchema = z.string().min(1, `${field.label} is required`)
          } else {
            fieldSchema = z.string().optional()
          }
      }

      shape[field.key] = fieldSchema
    }
  }

  return z.object(shape)
}

// Build default values from template fields
function buildDefaults(steps: DecisionStep[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}

  for (const step of steps) {
    for (const field of step.fields) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default
      } else if (field.type === 'toggle') {
        defaults[field.key] = false
      }
    }
  }

  return defaults
}

export function DecisionWizard({ template }: DecisionWizardProps) {
  const router = useRouter()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [result, setResult] = useState<DecisionRunResponse | null>(null)
  // Create/append mode state
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('create')
  const [targetScenarioId, setTargetScenarioId] = useState<string>('')

  const steps = template.uiSchema?.steps || []
  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const schema = useMemo(() => buildSchema(steps), [steps])
  const defaults = useMemo(() => buildDefaults(steps), [steps])

  // Check if template needs accounts (has account_select, debt_select, or asset_select fields)
  const needsAccounts = useMemo(() => {
    return steps.some(step =>
      step.fields.some(f =>
        f.type === 'account_select' || f.type === 'debt_select' || f.type === 'asset_select'
      )
    )
  }, [steps])

  // Fetch accounts if needed
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
    enabled: needsAccounts,
  })

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaults,
    mode: 'onChange',
  })

  const watchValues = form.watch()

  const runMutation = useMutation({
    mutationFn: (inputs: Record<string, unknown>) =>
      decisions.run({
        templateKey: template.key,
        inputs,
        targetScenarioId: scenarioMode === 'append' ? targetScenarioId : undefined,
      }),
    onSuccess: (data) => {
      setResult(data)
      if (data.scenarioCreated) {
        toast.success('Scenario created!', {
          description: `"${data.scenarioName}" has been created.`,
        })
      } else {
        toast.success('Changes added!', {
          description: `${data.changesCreated} changes added to "${data.scenarioName}".`,
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to create scenario', {
        description: error.message,
      })
    },
  })

  // Validate current step fields before proceeding
  const validateCurrentStep = async () => {
    const fieldsToValidate = currentStep.fields
      .filter(f => !f.showIf || watchValues[f.showIf])
      .map(f => f.key)

    const result = await form.trigger(fieldsToValidate as (keyof typeof defaults)[])
    return result
  }

  const handleNext = async () => {
    const isValid = await validateCurrentStep()
    if (isValid && !isLastStep) {
      setCurrentStepIndex(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    const isValid = await form.trigger()
    if (isValid) {
      const values = form.getValues()
      runMutation.mutate(values)
    }
  }

  const handleStartAnother = () => {
    setResult(null)
    setCurrentStepIndex(0)
    setScenarioMode('create')
    setTargetScenarioId('')
    form.reset(defaults)
  }

  // Show results if we have them
  if (result) {
    return (
      <DecisionResults
        result={result}
        onStartAnother={handleStartAnother}
      />
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Stepper sidebar */}
      <div className="lg:w-64 flex-shrink-0">
        <nav className="space-y-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex

            return (
              <button
                key={step.id}
                onClick={() => index <= currentStepIndex && setCurrentStepIndex(index)}
                disabled={index > currentStepIndex || runMutation.isPending}
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
      <div className="flex-1 space-y-4">
        {/* Scenario mode selection - shows on last step */}
        {isLastStep && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Where should we save this?</CardTitle>
              <CardDescription>
                Create a new scenario or add to an existing one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={scenarioMode}
                onValueChange={(value) => {
                  setScenarioMode(value as ScenarioMode)
                  if (value === 'create') {
                    setTargetScenarioId('')
                  }
                }}
                className="grid gap-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="create" id="create" className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="create"
                      className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      Create new scenario
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Start fresh with a dedicated scenario for this decision
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="append" id="append" className="mt-1" />
                  <div className="grid gap-1.5 leading-none flex-1">
                    <label
                      htmlFor="append"
                      className="flex items-center gap-2 text-sm font-medium leading-none cursor-pointer"
                    >
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      Add to existing scenario
                    </label>
                    <p className="text-sm text-muted-foreground">
                      Combine this decision with other changes you&apos;re exploring
                    </p>
                    {scenarioMode === 'append' && (
                      <div className="pt-2">
                        <ScenarioPicker
                          value={targetScenarioId}
                          onValueChange={setTargetScenarioId}
                          excludeBaseline={true}
                          placeholder="Select a scenario..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{currentStep?.title}</CardTitle>
            {currentStep?.description && (
              <CardDescription>{currentStep.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                {currentStep?.fields.map((field) => (
                  <WizardField
                    key={field.key}
                    field={field}
                    form={form}
                    watchValues={watchValues}
                    accounts={accountsData?.results || []}
                  />
                ))}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep || runMutation.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={runMutation.isPending || (scenarioMode === 'append' && !targetScenarioId)}
            >
              {runMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {scenarioMode === 'append' ? 'Adding changes...' : 'Creating scenario...'}
                </>
              ) : scenarioMode === 'append' ? (
                'Add Changes'
              ) : (
                'Create Scenario'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={runMutation.isPending}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
