'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { goals as goalsApi } from '@/lib/api'
import type { Goal, GoalSolution, GoalSolveOptions } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Loader2, Target, ChevronRight, Play } from 'lucide-react'

interface GoalSolverProps {
  goal: Goal
  onClose?: () => void
}

const interventionOptions = [
  { id: 'reduce_expenses', label: 'Reduce expenses', description: 'Cut discretionary spending' },
  { id: 'increase_income', label: 'Increase income', description: 'Earn more through raises or side income' },
  { id: 'accelerate_debt', label: 'Accelerate debt payoff', description: 'Pay extra toward debt each month' },
  { id: 'increase_retirement', label: 'Increase retirement savings', description: 'Boost 401(k)/IRA contributions' },
]

export function GoalSolver({ goal, onClose }: GoalSolverProps) {
  const router = useRouter()
  const [step, setStep] = useState<'options' | 'solving' | 'result'>('options')
  const [solution, setSolution] = useState<GoalSolution | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  // Solver options - set defaults based on goal type
  const getDefaultInterventions = () => {
    if (goal.goalType === 'debt_free_date') {
      return ['accelerate_debt']
    }
    if (goal.goalType === 'retirement_age') {
      return ['increase_retirement', 'reduce_expenses']
    }
    return ['reduce_expenses', 'increase_income']
  }

  const [selectedInterventions, setSelectedInterventions] = useState<string[]>(getDefaultInterventions())
  const [maxExpenseReduction, setMaxExpenseReduction] = useState('1000')
  const [maxIncomeIncrease, setMaxIncomeIncrease] = useState('2000')
  const [maxDebtAcceleration, setMaxDebtAcceleration] = useState('1000')
  const [maxRetirementIncrease, setMaxRetirementIncrease] = useState('1000')
  const [projectionMonths, setProjectionMonths] = useState('24')

  const handleToggleIntervention = (id: string) => {
    setSelectedInterventions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSolve = async () => {
    setStep('solving')
    setError(null)

    const options: GoalSolveOptions = {
      allowedInterventions: selectedInterventions,
      bounds: {
        maxReduceExpensesMonthly: maxExpenseReduction,
        maxIncreaseIncomeMonthly: maxIncomeIncrease,
        maxAccelerateDebtMonthly: maxDebtAcceleration,
        maxIncreaseRetirementMonthly: maxRetirementIncrease,
      },
      projectionMonths: parseInt(projectionMonths, 10),
      optimizeCombined: selectedInterventions.length > 1,
    }

    try {
      const result = await goalsApi.solve(goal.id, options)
      setSolution(result)
      setStep('result')
    } catch (err) {
      console.error('Solver failed:', err)
      setError('Failed to compute solution. Please try again.')
      setStep('options')
    }
  }

  const handleApply = async () => {
    if (!solution || !solution.plan.length) return

    setApplying(true)
    try {
      const response = await goalsApi.applySolution(
        goal.id,
        solution.plan,
        `Achieve: ${goal.displayName}`
      )
      router.push(response.redirectUrl as `/scenarios/${string}`)
    } catch (err) {
      console.error('Failed to apply solution:', err)
      setError('Failed to create scenario from solution.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Goal Solver</CardTitle>
        </div>
        <CardDescription>
          Find the best path to achieve: {goal.displayName}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'options' && (
          <div className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <Label>Allowed interventions</Label>
              <div className="space-y-2">
                {interventionOptions.map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={opt.id}
                      checked={selectedInterventions.includes(opt.id)}
                      onCheckedChange={() => handleToggleIntervention(opt.id)}
                    />
                    <label
                      htmlFor={opt.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Constraints</Label>
              <div className="grid grid-cols-2 gap-4">
                {selectedInterventions.includes('reduce_expenses') && (
                  <div className="space-y-2">
                    <Label htmlFor="max-expense" className="text-xs text-muted-foreground">
                      Max expense reduction ($/mo)
                    </Label>
                    <Input
                      id="max-expense"
                      type="number"
                      value={maxExpenseReduction}
                      onChange={(e) => setMaxExpenseReduction(e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                )}
                {selectedInterventions.includes('increase_income') && (
                  <div className="space-y-2">
                    <Label htmlFor="max-income" className="text-xs text-muted-foreground">
                      Max income increase ($/mo)
                    </Label>
                    <Input
                      id="max-income"
                      type="number"
                      value={maxIncomeIncrease}
                      onChange={(e) => setMaxIncomeIncrease(e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                )}
                {selectedInterventions.includes('accelerate_debt') && (
                  <div className="space-y-2">
                    <Label htmlFor="max-debt" className="text-xs text-muted-foreground">
                      Max extra debt payment ($/mo)
                    </Label>
                    <Input
                      id="max-debt"
                      type="number"
                      value={maxDebtAcceleration}
                      onChange={(e) => setMaxDebtAcceleration(e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                )}
                {selectedInterventions.includes('increase_retirement') && (
                  <div className="space-y-2">
                    <Label htmlFor="max-retirement" className="text-xs text-muted-foreground">
                      Max extra retirement savings ($/mo)
                    </Label>
                    <Input
                      id="max-retirement"
                      type="number"
                      value={maxRetirementIncrease}
                      onChange={(e) => setMaxRetirementIncrease(e.target.value)}
                      min="0"
                      step="100"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projection-months" className="text-xs text-muted-foreground">
                Projection horizon (months)
              </Label>
              <Input
                id="projection-months"
                type="number"
                value={projectionMonths}
                onChange={(e) => setProjectionMonths(e.target.value)}
                min="6"
                max="120"
                step="6"
                className="w-24"
              />
            </div>
          </div>
        )}

        {step === 'solving' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Computing optimal solution...</p>
          </div>
        )}

        {step === 'result' && solution && (
          <div className="space-y-4">
            {solution.success ? (
              <>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Solution found!</span>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current value:</span>
                    <span className="font-medium">{solution.result.baselineValue}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projected value:</span>
                    <span className="font-medium text-green-600">{solution.result.finalValue}</span>
                  </div>
                  {solution.result.message && (
                    <p className="text-sm text-muted-foreground">{solution.result.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Required changes:</h4>
                  {solution.plan.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-background rounded border"
                    >
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {step.name || step.changeType.replace(/_/g, ' ')}
                      </span>
                      {step.parameters.monthlyAdjustment !== undefined && (
                        <Badge variant="outline" className="ml-auto">
                          ${Math.abs(parseFloat(String(step.parameters.monthlyAdjustment)))}/mo
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Partial solution</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {solution.errorMessage || 'Could not find a solution within the specified constraints.'}
                </p>
                {solution.plan.length > 0 && (
                  <p className="text-sm">
                    Best attempt achieves: <strong>{solution.result.finalValue}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>

        {step === 'options' && (
          <Button
            onClick={handleSolve}
            disabled={selectedInterventions.length === 0}
          >
            Find Solution
          </Button>
        )}

        {step === 'result' && solution && solution.plan.length > 0 && (
          <Button
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Create Scenario
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
