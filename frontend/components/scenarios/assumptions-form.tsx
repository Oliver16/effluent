'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Scenario } from '@/lib/types';
import { scenarios } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AssumptionsFormProps {
  scenario: Scenario;
}

export function AssumptionsForm({ scenario }: AssumptionsFormProps) {
  const queryClient = useQueryClient();
  const [inflationRate, setInflationRate] = useState('');
  const [investmentReturn, setInvestmentReturn] = useState('');
  const [salaryGrowth, setSalaryGrowth] = useState('');

  useEffect(() => {
    setInflationRate(((parseFloat(scenario.inflationRate || '0') || 0) * 100).toString());
    setInvestmentReturn(((parseFloat(scenario.investmentReturnRate || '0') || 0) * 100).toString());
    setSalaryGrowth(((parseFloat(scenario.salaryGrowthRate || '0') || 0) * 100).toString());
  }, [scenario]);

  const mutation = useMutation({
    mutationFn: (data: Partial<Scenario>) => scenarios.update(scenario.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scenarios', scenario.id] }),
  });

  const handleSubmit = () => {
    mutation.mutate({
      inflationRate: (parseFloat(inflationRate) / 100 || 0).toString(),
      investmentReturnRate: (parseFloat(investmentReturn) / 100 || 0).toString(),
      salaryGrowthRate: (parseFloat(salaryGrowth) / 100 || 0).toString(),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assumptions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
            <Input
              id="inflationRate"
              type="number"
              step="0.1"
              value={inflationRate}
              onChange={(event) => setInflationRate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="investmentReturn">Investment Return (%)</Label>
            <Input
              id="investmentReturn"
              type="number"
              step="0.1"
              value={investmentReturn}
              onChange={(event) => setInvestmentReturn(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salaryGrowth">Salary Growth (%)</Label>
            <Input
              id="salaryGrowth"
              type="number"
              step="0.1"
              value={salaryGrowth}
              onChange={(event) => setSalaryGrowth(event.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Assumptions'}
        </Button>
      </CardContent>
    </Card>
  );
}
