'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, PlayCircle } from 'lucide-react';
import { pollTaskStatus } from '@/lib/task-polling';

/**
 * Build headers with JWT authentication for API requests.
 * This ensures all admin task requests include proper authentication.
 */
function buildAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add household ID if available
  const householdId = typeof window !== 'undefined' ? localStorage.getItem('householdId') : null;
  if (householdId) {
    headers['X-Household-ID'] = householdId;
  }

  return headers;
}

interface TaskResult {
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
  taskId?: string;
}

export default function AdminTasksPage() {
  const [taxRecalcResult, setTaxRecalcResult] = useState<TaskResult>({ status: 'idle' });
  const [scenarioCompareResult, setScenarioCompareResult] = useState<TaskResult>({ status: 'idle' });
  const [realityChangesResult, setRealityChangesResult] = useState<TaskResult>({ status: 'idle' });
  const [cleanupEventsResult, setCleanupEventsResult] = useState<TaskResult>({ status: 'idle' });

  const [scenarioIds, setScenarioIds] = useState('');

  const handleTaxRecalculation = async () => {
    setTaxRecalcResult({ status: 'running' });
    try {
      const response = await fetch('/api/v1/flows/recalculate_tax_withholding/', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ async: true }),
      });

      if (!response.ok) throw new Error('Failed to trigger tax recalculation');

      const data = await response.json();

      if (data.task_id) {
        setTaxRecalcResult({
          status: 'running',
          message: 'Task started, polling for completion...',
          taskId: data.task_id
        });

        const result = await pollTaskStatus(
          data.task_id,
          '/api/v1/scenarios/tasks/{taskId}/',
          {
            onProgress: (status, elapsed) => {
              setTaxRecalcResult({
                status: 'running',
                message: `Processing... (${elapsed}s elapsed)`,
                taskId: data.task_id
              });
            }
          }
        );

        setTaxRecalcResult({
          status: 'success',
          message: `Tax recalculation completed! ${result.flows_created || 0} flows created, ${result.flows_deleted || 0} deleted.`,
          data: result
        });
      } else {
        setTaxRecalcResult({ status: 'success', message: 'Tax recalculation completed synchronously', data });
      }
    } catch (error) {
      setTaxRecalcResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleScenarioComparison = async () => {
    const ids = scenarioIds.split(',').map(id => id.trim()).filter(id => id);

    if (ids.length < 2) {
      setScenarioCompareResult({ status: 'error', message: 'Please enter at least 2 scenario IDs' });
      return;
    }

    setScenarioCompareResult({ status: 'running' });
    try {
      const response = await fetch('/api/v1/scenarios/compare/', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          scenario_ids: ids,
          async: true,
          include_drivers: true
        }),
      });

      if (!response.ok) throw new Error('Failed to trigger scenario comparison');

      const data = await response.json();

      if (data.task_id) {
        setScenarioCompareResult({
          status: 'running',
          message: 'Task started, polling for completion...',
          taskId: data.task_id
        });

        const result = await pollTaskStatus(
          data.task_id,
          '/api/v1/scenarios/tasks/{taskId}/',
          {
            onProgress: (status, elapsed) => {
              setScenarioCompareResult({
                status: 'running',
                message: `Comparing scenarios... (${elapsed}s elapsed)`,
                taskId: data.task_id
              });
            }
          }
        );

        setScenarioCompareResult({
          status: 'success',
          message: `Comparison completed! ${result.results?.length || 0} scenarios compared.`,
          data: result
        });
      } else {
        setScenarioCompareResult({ status: 'success', message: 'Comparison completed synchronously', data });
      }
    } catch (error) {
      setScenarioCompareResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleProcessRealityChanges = async () => {
    setRealityChangesResult({ status: 'running' });
    try {
      const response = await fetch('/api/v1/scenarios/admin-tasks/', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ action: 'process_reality_changes', batch_size: 100 }),
      });

      if (!response.ok) throw new Error('Failed to trigger reality changes processing');

      const data = await response.json();

      setRealityChangesResult({
        status: 'success',
        message: `Reality changes processing triggered. Task ID: ${data.task_id}`,
        data
      });
    } catch (error) {
      setRealityChangesResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const handleCleanupOldEvents = async () => {
    setCleanupEventsResult({ status: 'running' });
    try {
      const response = await fetch('/api/v1/scenarios/admin-tasks/', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({ action: 'cleanup_old_events' }),
      });

      if (!response.ok) throw new Error('Failed to trigger event cleanup');

      const data = await response.json();

      setCleanupEventsResult({
        status: 'success',
        message: `Event cleanup triggered. Task ID: ${data.task_id}`,
        data
      });
    } catch (error) {
      setCleanupEventsResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  const ResultAlert = ({ result }: { result: TaskResult }) => {
    if (result.status === 'idle') return null;

    return (
      <Alert className={`mt-4 ${
        result.status === 'success' ? 'border-green-500 bg-green-50' :
        result.status === 'error' ? 'border-red-500 bg-red-50' :
        'border-blue-500 bg-blue-50'
      }`}>
        <div className="flex items-start gap-2">
          {result.status === 'running' && <Loader2 className="h-4 w-4 animate-spin mt-0.5" />}
          {result.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
          {result.status === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
          <AlertDescription className="flex-1">
            {result.message}
            {result.taskId && (
              <div className="mt-2 text-xs font-mono text-gray-600">
                Task ID: {result.taskId}
              </div>
            )}
          </AlertDescription>
        </div>
      </Alert>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Management</h1>
        <p className="text-muted-foreground mt-2">
          Manually trigger Celery tasks and background operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tax Recalculation */}
        <Card>
          <CardHeader>
            <CardTitle>Recalculate Tax Withholding</CardTitle>
            <CardDescription>
              Regenerate tax withholding flows for all income sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleTaxRecalculation}
              disabled={taxRecalcResult.status === 'running'}
              className="w-full"
            >
              {taxRecalcResult.status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Recalculate Tax Withholding
                </>
              )}
            </Button>
            <ResultAlert result={taxRecalcResult} />
          </CardContent>
        </Card>

        {/* Scenario Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Compare Scenarios (Async)</CardTitle>
            <CardDescription>
              Compare multiple scenarios with driver analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="scenario-ids">Scenario IDs (comma-separated)</Label>
                <Input
                  id="scenario-ids"
                  placeholder="id1, id2, id3"
                  value={scenarioIds}
                  onChange={(e) => setScenarioIds(e.target.value)}
                />
              </div>
              <Button
                onClick={handleScenarioComparison}
                disabled={scenarioCompareResult.status === 'running'}
                className="w-full"
              >
                {scenarioCompareResult.status === 'running' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Compare Scenarios
                  </>
                )}
              </Button>
            </div>
            <ResultAlert result={scenarioCompareResult} />
          </CardContent>
        </Card>

        {/* Process Reality Changes */}
        <Card>
          <CardHeader>
            <CardTitle>Process Reality Changes</CardTitle>
            <CardDescription>
              Manually trigger reality change processing (normally runs every 30s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleProcessRealityChanges}
              disabled={realityChangesResult.status === 'running'}
              className="w-full"
              variant="outline"
            >
              {realityChangesResult.status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Process Reality Changes
                </>
              )}
            </Button>
            <ResultAlert result={realityChangesResult} />
          </CardContent>
        </Card>

        {/* Cleanup Old Events */}
        <Card>
          <CardHeader>
            <CardTitle>Cleanup Old Events</CardTitle>
            <CardDescription>
              Manually trigger event cleanup (normally runs daily at 3 AM)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCleanupOldEvents}
              disabled={cleanupEventsResult.status === 'running'}
              className="w-full"
              variant="outline"
            >
              {cleanupEventsResult.status === 'running' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Cleanup Old Events
                </>
              )}
            </Button>
            <ResultAlert result={cleanupEventsResult} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Available Endpoints:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code>POST /api/v1/flows/recalculate_tax_withholding/</code> - Recalculate tax withholding</li>
              <li><code>POST /api/v1/scenarios/compare/</code> - Compare scenarios (async)</li>
              <li><code>POST /api/v1/scenarios/admin-tasks/</code> - Trigger admin tasks</li>
              <li><code>POST /api/v1/scenarios/tasks/&#123;task_id&#125;/control/</code> - Control tasks (cancel/revoke)</li>
              <li><code>GET /api/v1/scenarios/tasks/</code> - List all tasks</li>
              <li><code>POST /api/v1/stress-tests/analyze/</code> - Analyze stress test results</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Task Control:</h3>
            <p className="text-muted-foreground">
              Tasks can be cancelled or terminated via the control endpoint by sending a POST request
              with <code>&#123;&quot;action&quot;: &quot;cancel&quot;&#125;</code> or <code>&#123;&quot;action&quot;: &quot;terminate&quot;&#125;</code>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
