'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScenarioProjection } from '@/lib/types';
import { formatCurrency, formatDecimal, formatPercent } from '@/lib/utils';

interface ProjectionTableProps {
  projections: ScenarioProjection[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Net Worth</TableHead>
            <TableHead>Income</TableHead>
            <TableHead>Expenses</TableHead>
            <TableHead>Cash Flow</TableHead>
            <TableHead>DSCR</TableHead>
            <TableHead>Savings Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projections.map((projection) => (
            <TableRow key={projection.id}>
              <TableCell>M{projection.monthNumber + 1}</TableCell>
              <TableCell>{formatCurrency(projection.netWorth)}</TableCell>
              <TableCell>{formatCurrency(projection.totalIncome)}</TableCell>
              <TableCell>{formatCurrency(projection.totalExpenses)}</TableCell>
              <TableCell>{formatCurrency(projection.netCashFlow)}</TableCell>
              <TableCell>{formatDecimal(projection.dscr, 2)}</TableCell>
              <TableCell>{formatPercent(projection.savingsRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
