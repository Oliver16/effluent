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
              <TableCell>M{projection.month_number + 1}</TableCell>
              <TableCell>{formatCurrency(projection.net_worth)}</TableCell>
              <TableCell>{formatCurrency(projection.total_income)}</TableCell>
              <TableCell>{formatCurrency(projection.total_expenses)}</TableCell>
              <TableCell>{formatCurrency(projection.net_cash_flow)}</TableCell>
              <TableCell>{formatDecimal(projection.dscr, 2)}</TableCell>
              <TableCell>{formatPercent(projection.savings_rate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
