'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { scenarios } from '@/lib/api';
import { Scenario } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TEMPLATES = [
  {
    name: 'Career Change',
    description: 'Model a new job offer with different pay and bonuses.',
    projectionMonths: 84,
    inflationRate: 3,
    investmentReturnRate: 7,
    salaryGrowthRate: 4,
  },
  {
    name: 'Buy a Home',
    description: 'Track the impact of buying a home and new mortgage payments.',
    projectionMonths: 120,
    inflationRate: 3,
    investmentReturnRate: 6,
    salaryGrowthRate: 3,
  },
  {
    name: 'Debt Payoff Sprint',
    description: 'Accelerate debt payoff with extra monthly payments.',
    projectionMonths: 60,
    inflationRate: 2.5,
    investmentReturnRate: 5,
    salaryGrowthRate: 3,
  },
];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewScenarioPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectionMonths, setProjectionMonths] = useState('60');
  const [startDate, setStartDate] = useState(todayString());
  const [inflationRate, setInflationRate] = useState('3');
  const [investmentReturnRate, setInvestmentReturnRate] = useState('7');
  const [salaryGrowthRate, setSalaryGrowthRate] = useState('3');

  const mutation = useMutation({
    mutationFn: (payload: Partial<Scenario>) => scenarios.create(payload),
    onSuccess: (scenario) => router.push(`/scenarios/${scenario.id}`),
  });

  const handleTemplate = (template: (typeof TEMPLATES)[number]) => {
    setName(template.name);
    setDescription(template.description);
    setProjectionMonths(template.projectionMonths.toString());
    setInflationRate(template.inflationRate.toString());
    setInvestmentReturnRate(template.investmentReturnRate.toString());
    setSalaryGrowthRate(template.salaryGrowthRate.toString());
  };

  const handleSubmit = () => {
    mutation.mutate({
      name,
      description,
      projection_months: parseInt(projectionMonths, 10) || 60,
      start_date: startDate,
      inflation_rate: (parseFloat(inflationRate) / 100 || 0).toString(),
      investment_return_rate: (parseFloat(investmentReturnRate) / 100 || 0).toString(),
      salary_growth_rate: (parseFloat(salaryGrowthRate) / 100 || 0).toString(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Scenario</h1>
        <p className="text-sm text-muted-foreground">
          Start with a template or build your own scenario assumptions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TEMPLATES.map((template) => (
          <Card key={template.name}>
            <CardHeader>
              <CardTitle className="text-base">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{template.description}</p>
              <Button variant="outline" size="sm" onClick={() => handleTemplate(template)}>
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Scenario Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., New Job Offer"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional summary"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="projectionMonths">Projection Months</Label>
              <Input
                id="projectionMonths"
                type="number"
                value={projectionMonths}
                onChange={(event) => setProjectionMonths(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inflationRate">Inflation (%)</Label>
              <Input
                id="inflationRate"
                type="number"
                step="0.1"
                value={inflationRate}
                onChange={(event) => setInflationRate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investmentReturnRate">Investment Return (%)</Label>
              <Input
                id="investmentReturnRate"
                type="number"
                step="0.1"
                value={investmentReturnRate}
                onChange={(event) => setInvestmentReturnRate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryGrowthRate">Salary Growth (%)</Label>
              <Input
                id="salaryGrowthRate"
                type="number"
                step="0.1"
                value={salaryGrowthRate}
                onChange={(event) => setSalaryGrowthRate(event.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Scenario'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
