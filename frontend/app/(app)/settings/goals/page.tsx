'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goals } from '@/lib/api'
import { Goal, GoalType } from '@/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Target,
  Calendar,
  Shield,
  PiggyBank,
  DollarSign,
  Clock,
} from 'lucide-react'

const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; icon: React.ReactNode; unit: string; description: string }> = {
  emergency_fund_months: {
    label: 'Emergency Fund',
    icon: <Calendar className="h-4 w-4" />,
    unit: 'months',
    description: 'Target months of expenses in liquid assets',
  },
  min_dscr: {
    label: 'Debt Service Coverage',
    icon: <Shield className="h-4 w-4" />,
    unit: 'ratio',
    description: 'Minimum income to debt service ratio',
  },
  min_savings_rate: {
    label: 'Savings Rate',
    icon: <PiggyBank className="h-4 w-4" />,
    unit: 'percent',
    description: 'Target percentage of income saved',
  },
  net_worth_target_by_date: {
    label: 'Net Worth Target',
    icon: <DollarSign className="h-4 w-4" />,
    unit: 'usd',
    description: 'Target net worth by a specific date',
  },
  retirement_age: {
    label: 'Retirement Age',
    icon: <Clock className="h-4 w-4" />,
    unit: 'age',
    description: 'Target age for retirement',
  },
}

const goalFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  goal_type: z.enum([
    'emergency_fund_months',
    'min_dscr',
    'min_savings_rate',
    'net_worth_target_by_date',
    'retirement_age',
  ] as const),
  target_value: z.string().min(1, 'Target value is required'),
  target_date: z.string().optional(),
  is_primary: z.boolean().default(false),
})

type GoalFormValues = z.infer<typeof goalFormSchema>

export default function GoalsSettingsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState<Goal | null>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goals.list(),
  })

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: '',
      goal_type: 'emergency_fund_months',
      target_value: '',
      target_date: '',
      is_primary: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: GoalFormValues) => goals.create({
      ...data,
      target_value: data.target_value,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', 'status'] })
      setDialogOpen(false)
      form.reset()
      toast({ title: 'Goal created successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to create goal', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GoalFormValues }) =>
      goals.update(id, {
        ...data,
        target_value: data.target_value,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', 'status'] })
      setDialogOpen(false)
      setEditingGoal(null)
      form.reset()
      toast({ title: 'Goal updated successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to update goal', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goals.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', 'status'] })
      setDeleteConfirmGoal(null)
      toast({ title: 'Goal deleted successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to delete goal', variant: 'destructive' })
    },
  })

  const handleOpenDialog = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal)
      form.reset({
        name: goal.name,
        goal_type: goal.goalType as GoalType,
        target_value: goal.targetValue,
        target_date: goal.targetDate || '',
        is_primary: goal.isPrimary,
      })
    } else {
      setEditingGoal(null)
      form.reset()
    }
    setDialogOpen(true)
  }

  const handleSubmit = (values: GoalFormValues) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const goalType = form.watch('goal_type')
  const needsTargetDate = goalType === 'net_worth_target_by_date'
  const config = GOAL_TYPE_CONFIG[goalType as GoalType]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Configure your financial goals</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading goals...</div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Configure your financial goals</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading goals</AlertTitle>
          <AlertDescription>
            Unable to load your goals. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const goalsList = data?.results || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Configure your financial goals</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {goalsList.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No goals yet</h3>
              <p className="text-muted-foreground mt-1">
                Set financial goals to track your progress on the dashboard.
              </p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Goal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goalsList.map((goal: Goal) => {
            const config = GOAL_TYPE_CONFIG[goal.goalType as GoalType]
            return (
              <Card key={goal.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        {config?.icon || <Target className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{goal.name}</h3>
                          {goal.isPrimary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Target: {goal.targetValue} {goal.targetUnit}
                          {goal.targetDate && ` by ${goal.targetDate}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmGoal(goal)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Goal Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Edit Goal' : 'Add Goal'}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'Update your financial goal settings.'
                : 'Set a new financial goal to track on your dashboard.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="goal_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(GOAL_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              {config.icon}
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {config && (
                      <FormDescription>{config.description}</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Goal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Value ({config?.unit})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {needsTargetDate && (
                <FormField
                  control={form.control}
                  name="target_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Primary Goal</FormLabel>
                      <FormDescription>
                        Your primary goal will be highlighted on the dashboard
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingGoal
                    ? 'Update'
                    : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmGoal}
        onOpenChange={() => setDeleteConfirmGoal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmGoal?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmGoal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmGoal && deleteMutation.mutate(deleteConfirmGoal.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
