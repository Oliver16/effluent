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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Check, ChevronLeft, ChevronRight, Loader2, CheckCircle, ArrowRight, GitBranch, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SURFACE, STATUS_COLORS } from '@/lib/design-tokens'
import { ScenarioPicker } from '@/components/scenarios/scenario-picker'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, INCOME_TYPES } from '@/components/scenarios/change-field-config'

// Frequency options matching backend Frequency enum
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'semimonthly', label: 'Semi-monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiannually', label: 'Semi-annually' },
  { value: 'annually', label: 'Annually' },
]

type ScenarioMode = 'create' | 'append'

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
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>('create')
  const [scenarioName, setScenarioName] = useState(
    `${template.name} - ${new Date().toLocaleDateString()}`
  )
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('')
  // Get suggested changes with fallback
  const suggestedChanges = template.suggestedChanges || []

  // Compute choice groups - changes with the same choiceGroup are mutually exclusive
  const choiceGroups = useMemo(() => {
    const groups: Record<string, { indices: number[]; changes: SuggestedChange[] }> = {}
    suggestedChanges.forEach((change, idx) => {
      if (change.choiceGroup) {
        if (!groups[change.choiceGroup]) {
          groups[change.choiceGroup] = { indices: [], changes: [] }
        }
        groups[change.choiceGroup].indices.push(idx)
        groups[change.choiceGroup].changes.push(change)
      }
    })
    return groups
  }, [suggestedChanges])

  // Track which option is selected in each choice group
  const [choiceGroupSelections, setChoiceGroupSelections] = useState<Record<string, number>>(() => {
    // Initialize with first option of each choice group selected
    const selections: Record<string, number> = {}
    Object.keys(choiceGroups).forEach(groupName => {
      selections[groupName] = choiceGroups[groupName].indices[0]
    })
    return selections
  })

  const [changeValues, setChangeValues] = useState<Record<string, ChangeValue>>(() => {
    // Initialize change values from template
    const values: Record<string, ChangeValue> = {}
    const changes = suggestedChanges || []
    changes.forEach((change, idx) => {
      // For choice group items, only the first option in each group is enabled by default
      const isInChoiceGroup = !!change.choiceGroup
      const isFirstInGroup = isInChoiceGroup &&
        Object.values(choiceGroups).some(g => g.indices[0] === idx)

      values[String(idx)] = {
        _skip: isInChoiceGroup ? !isFirstInGroup : !change.isRequired,
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
    enabled: suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'income'),
  })

  // Fetch expense flows for source flow selection
  const { data: flowsData } = useQuery({
    queryKey: ['flows'],
    queryFn: flows.list,
    enabled: suggestedChanges.some(c => c.requiresSourceFlow && c.sourceFlowType === 'expense'),
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
      .filter((flow: RecurringFlow) => flow.flowType === 'expense' && flow.isActive !== false)
      .map((flow: RecurringFlow) => ({
        id: flow.id,
        name: flow.name,
        amount: parseFloat(String(flow.amount || '0')),
      }))
  }, [flowsData])

  // Create or append scenario with life event
  const createMutation = useMutation({
    mutationFn: async () => {
      let scenarioId: string
      let scenarioNameResult: string
      let wasCreated: boolean

      if (scenarioMode === 'create') {
        // Create a new scenario first - start_date is required
        const scenario = await scenarios.create({
          name: scenarioName,
          description: `Created from life event: ${template.name}`,
          startDate: effectiveDate || new Date().toISOString().split('T')[0],
        })
        scenarioId = scenario.id
        scenarioNameResult = scenario.name
        wasCreated = true
      } else {
        // Append to existing scenario
        scenarioId = selectedScenarioId
        scenarioNameResult = 'existing scenario' // Will be updated from response if needed
        wasCreated = false
      }

      try {
        // Apply the life event template to the scenario
        const response = await lifeEventTemplates.apply(template.name, {
          scenarioId: scenarioId,
          effectiveDate: effectiveDate,
          changeValues: changeValues,
        })

        try {
          // Compute projections so the scenario is immediately usable
          await scenarios.compute(scenarioId)
        } catch (computeError) {
          // If compute fails, rollback the scenario if we just created it
          if (wasCreated) {
            console.error('Compute failed, rolling back scenario:', computeError)
            try {
              await scenarios.delete(scenarioId)
            } catch (deleteError) {
              console.error('Failed to rollback scenario:', deleteError)
            }
          }
          throw new Error(`Failed to compute projections: ${computeError instanceof Error ? computeError.message : 'Unknown error'}`)
        }

        return {
          scenarioId: scenarioId,
          scenarioName: response.templateName ? `${response.templateName} scenario` : scenarioNameResult,
          changesApplied: response.changesCreated || Object.values(changeValues).filter(v => !v._skip).length,
          wasCreated: wasCreated,
        }
      } catch (applyError) {
        // If apply fails, rollback the scenario if we just created it
        if (wasCreated) {
          console.error('Apply failed, rolling back scenario:', applyError)
          try {
            await scenarios.delete(scenarioId)
          } catch (deleteError) {
            console.error('Failed to rollback scenario:', deleteError)
          }
        }
        throw applyError
      }
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['scenarios'] })
      if (data.wasCreated) {
        toast.success('Scenario created!', {
          description: `"${data.scenarioName}" is ready to analyze.`,
        })
      } else {
        toast.success('Changes added!', {
          description: `Added ${data.changesApplied} changes to "${data.scenarioName}".`,
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to apply changes', {
        description: error.message,
      })
    },
  })

  const handleChangeValue = (changeIdx: number, field: string, value: unknown) => {
    // Convert value to appropriate type based on field name
    let convertedValue = value

    if (field === 'amount' || field === 'principal' || field === 'rate' || field === 'payment') {
      // Convert to number for numeric fields
      convertedValue = value ? parseFloat(String(value)) : 0
    } else if (field === 'term_months' || field === 'months' || field === 'recovery_months') {
      // Convert to integer for month fields
      convertedValue = value ? parseInt(String(value), 10) : 0
    }

    setChangeValues((prev) => ({
      ...prev,
      [String(changeIdx)]: {
        ...prev[String(changeIdx)],
        [field]: convertedValue,
      },
    }))
  }

  // Handle choice group selection - when one option is selected, skip others in same group
  const handleChoiceGroupSelect = (groupName: string, selectedIdx: number) => {
    const group = choiceGroups[groupName]
    if (!group) return

    setChoiceGroupSelections(prev => ({
      ...prev,
      [groupName]: selectedIdx
    }))

    // Update changeValues to skip all other options in this group
    setChangeValues(prev => {
      const updated = { ...prev }
      group.indices.forEach(idx => {
        updated[String(idx)] = {
          ...updated[String(idx)],
          _skip: idx !== selectedIdx
        }
      })
      return updated
    })
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
    // Validate required fields before submission
    const validationErrors: string[] = []

    // Check each enabled change for required fields
    Object.entries(changeValues).forEach(([changeIdxStr, values]) => {
      if (values._skip) return // Skip disabled changes

      const changeIdx = parseInt(changeIdxStr)
      const change = suggestedChanges[changeIdx]
      if (!change) return

      const params = change.parametersTemplate || {}

      // Check for amount field (required for most change types)
      if ('amount' in params && (!values.amount || values.amount === 0)) {
        validationErrors.push(`"${change.name}" requires an amount`)
      }

      // Check for frequency field
      if ('frequency' in params && !values.frequency) {
        validationErrors.push(`"${change.name}" requires a frequency`)
      }

      // Check for source_flow_id/source_account_id for MODIFY/REMOVE changes
      if (change.changeType?.includes('MODIFY') || change.changeType?.includes('REMOVE')) {
        if (!values.source_flow_id && !values.source_account_id) {
          validationErrors.push(`"${change.name}" requires selecting a source`)
        }
      }
    })

    // Show validation errors
    if (validationErrors.length > 0) {
      toast.error('Please fix the following errors:', {
        description: validationErrors.join('\n'),
        duration: 5000,
      })
      return
    }

    createMutation.mutate()
  }

  const selectedChangesCount = Object.values(changeValues).filter(v => !v._skip).length

  // Show results if we have them
  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className={SURFACE.cardGood}>
          <CardHeader className="text-center pb-4">
            <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4", STATUS_COLORS.good.bg)}>
              <CheckCircle className={cn("h-8 w-8", STATUS_COLORS.good.text)} />
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
                    isCompleted && 'bg-emerald-500 text-white',
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
        {/* Step 1: Overview - includes mode selection (create vs append) */}
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Model this life event</CardTitle>
              <CardDescription>
                Choose how to add {template.name.toLowerCase()} to your projections
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mode Selection - git-inspired but user-friendly */}
              <div className="space-y-3">
                <Label>How would you like to save this?</Label>
                <RadioGroup
                  value={scenarioMode}
                  onValueChange={(v) => setScenarioMode(v as ScenarioMode)}
                  className="grid gap-3"
                >
                  <label
                    htmlFor="mode-create"
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      scenarioMode === 'create'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <RadioGroupItem value="create" id="mode-create" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Plus className="h-4 w-4" />
                        Create new scenario
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Start fresh with a new "what-if" scenario for this event
                      </p>
                    </div>
                  </label>
                  <label
                    htmlFor="mode-append"
                    className={cn(
                      'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors',
                      scenarioMode === 'append'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <RadioGroupItem value="append" id="mode-append" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-medium">
                        <GitBranch className="h-4 w-4" />
                        Add to existing scenario
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Combine with changes from another scenario you've already created
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Conditional: Scenario name (create) or Scenario picker (append) */}
              {scenarioMode === 'create' ? (
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
              ) : (
                <div className="space-y-2">
                  <Label>Select Scenario</Label>
                  <ScenarioPicker
                    value={selectedScenarioId}
                    onValueChange={setSelectedScenarioId}
                    excludeBaseline={true}
                    placeholder="Choose a scenario to add changes to..."
                  />
                  <p className="text-sm text-muted-foreground">
                    The changes from this event will be added to the selected scenario
                  </p>
                </div>
              )}

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
                  When these changes will start affecting your finances
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">This event includes:</h4>
                <div className="flex flex-wrap gap-2">
                  {suggestedChanges.map((change, idx) => (
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
                  {/* Render choice groups first */}
                  {Object.entries(choiceGroups).map(([groupName, group]) => {
                    // Determine description based on choice group name
                    const groupDescriptions: Record<string, string> = {
                      'primary_care': 'Select how you want to handle childcare',
                      'work_status': 'Select how this will affect your employment',
                    }
                    const description = groupDescriptions[groupName] || 'Select one of the following options'

                    return (
                    <Card key={`group-${groupName}`} className="border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">Choose one option</CardTitle>
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        </div>
                        <CardDescription>
                          {description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <RadioGroup
                          value={String(choiceGroupSelections[groupName])}
                          onValueChange={(value) => handleChoiceGroupSelect(groupName, parseInt(value))}
                          className="space-y-3"
                        >
                          {group.indices.map((idx) => {
                            const change = suggestedChanges[idx]
                            const isSelected = choiceGroupSelections[groupName] === idx
                            return (
                              <div key={idx} className="space-y-2">
                                <div className="flex items-start space-x-3">
                                  <RadioGroupItem value={String(idx)} id={`choice-${idx}`} className="mt-1" />
                                  <div className="flex-1">
                                    <Label htmlFor={`choice-${idx}`} className="font-medium cursor-pointer">
                                      {change.name}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">{change.description}</p>
                                  </div>
                                </div>

                                {/* Show fields for selected option */}
                                {isSelected && (
                                  <div className="ml-6 mt-2 p-3 bg-muted/50 rounded-lg">
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

                                        // Handle frequency field with dropdown
                                        if (key === 'frequency') {
                                          return (
                                            <div key={key} className="space-y-1">
                                              <Label className="text-sm">{label}</Label>
                                              <Select
                                                value={String(value)}
                                                onValueChange={(v) => handleChangeValue(idx, key, v)}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {FREQUENCY_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )
                                        }

                                        // Handle category field with dropdown (income or expense based on change type)
                                        if (key === 'category') {
                                          const isIncome = change.changeType === 'add_income' || change.changeType === 'modify_income'
                                          const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                                          return (
                                            <div key={key} className="space-y-1">
                                              <Label className="text-sm">{label}</Label>
                                              <Select
                                                value={String(value)}
                                                onValueChange={(v) => handleChangeValue(idx, key, v)}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {categories.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )
                                        }

                                        // Handle income_type field with dropdown
                                        if (key === 'income_type') {
                                          return (
                                            <div key={key} className="space-y-1">
                                              <Label className="text-sm">Income Type (for taxes)</Label>
                                              <Select
                                                value={String(value)}
                                                onValueChange={(v) => handleChangeValue(idx, key, v)}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select income type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {INCOME_TYPES.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                      {opt.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )
                                        }

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
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </RadioGroup>
                      </CardContent>
                    </Card>
                    )
                  })}

                  {/* Render regular changes (not in choice groups) */}
                  {suggestedChanges.map((change, idx) => {
                    // Skip changes that are in a choice group
                    if (change.choiceGroup) return null

                    return (
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

                                // Handle frequency field with dropdown
                                if (key === 'frequency') {
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-sm">{label}</Label>
                                      <Select
                                        value={String(value)}
                                        onValueChange={(v) => handleChangeValue(idx, key, v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {FREQUENCY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )
                                }

                                // Handle category field with dropdown (income or expense based on change type)
                                if (key === 'category') {
                                  const isIncome = change.changeType === 'add_income' || change.changeType === 'modify_income'
                                  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-sm">{label}</Label>
                                      <Select
                                        value={String(value)}
                                        onValueChange={(v) => handleChangeValue(idx, key, v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {categories.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )
                                }

                                // Handle income_type field with dropdown
                                if (key === 'income_type') {
                                  return (
                                    <div key={key} className="space-y-1">
                                      <Label className="text-sm">Income Type (for taxes)</Label>
                                      <Select
                                        value={String(value)}
                                        onValueChange={(v) => handleChangeValue(idx, key, v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select income type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {INCOME_TYPES.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                              {opt.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )
                                }

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
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Your Changes</CardTitle>
              <CardDescription>
                {scenarioMode === 'create'
                  ? 'Confirm the details before creating your scenario'
                  : 'Confirm the changes to add to your scenario'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Life Event</span>
                  <span className="font-medium">{template.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {scenarioMode === 'create' ? 'New Scenario' : 'Adding to'}
                  </span>
                  <span className="font-medium flex items-center gap-2">
                    {scenarioMode === 'create' ? (
                      <>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                        {scenarioName}
                      </>
                    ) : (
                      <>
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        Existing scenario
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Effective Date</span>
                  <span className="font-medium">{new Date(effectiveDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Changes to Apply</span>
                  <span className="font-medium">{selectedChangesCount} of {suggestedChanges.length}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Selected Changes:</h4>
                <div className="space-y-2">
                  {suggestedChanges.map((change, idx) => {
                    if (changeValues[String(idx)]?._skip) return null
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500" />
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
            <Button
              onClick={handleNext}
              disabled={
                // Disable Next if in append mode without a selected scenario
                scenarioMode === 'append' && !selectedScenarioId && currentStep === 0
              }
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={
                createMutation.isPending ||
                selectedChangesCount === 0 ||
                (scenarioMode === 'append' && !selectedScenarioId)
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {scenarioMode === 'create' ? 'Creating...' : 'Adding...'}
                </>
              ) : scenarioMode === 'create' ? (
                'Create Scenario'
              ) : (
                'Add Changes'
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
