import { useEffect, useState } from 'react';
import { Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { getRuns } from '../lib/api';
import type { ApiSyncRun } from '../../shared/apiTypes';
import RunStatusBadge from '../components/RunStatusBadge';
import EmptyState from '@/components/EmptyState';
import { Button } from '../components/ui/button';
import { formatDateTime } from '../lib/format';

export default function RunsPage() {
  const [runs, setRuns] = useState<ApiSyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Status filter state
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRunsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRuns({
        status: statusFilter || undefined,
        limit: 50,
      });
      setRuns(data.runs);
    } catch (err) {
      console.error("Failed to load runs:", err);
      setError("Could not load execution history. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunsData();
  }, [statusFilter]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Sync Runs</h2>
          <p className="text-sm text-muted-foreground">Historical records of pull-based ingestion jobs.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchRunsData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Options */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex flex-col gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
            Job Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border text-foreground text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="partial">Partial</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="space-y-4 pt-2">
          <div className="h-8 bg-secondary/50 rounded animate-pulse" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-secondary/20 rounded border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-card rounded-lg border border-border p-6">
          <Activity className="h-8 w-8 text-destructive" />
          <h3 className="font-semibold text-base text-foreground">Error Loading Sync History</h3>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchRunsData} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Ingestion History"
          description="Sync run logs will appear here after you trigger database updates. Run npm run sync in your workspace root."
        />
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Status</th>
                  <th className="p-3">Source ID</th>
                  <th className="p-3">Job Type</th>
                  <th className="p-3">Started At</th>
                  <th className="p-3">Finished At</th>
                  <th className="p-3 text-right">Fetched</th>
                  <th className="p-3 text-right">Inserted</th>
                  <th className="p-3">Errors / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <RunStatusBadge status={run.status} />
                    </td>
                    <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                      {run.sourceId || "all"}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {run.jobType}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(run.startedAt)}
                    </td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">
                      {run.finishedAt ? formatDateTime(run.finishedAt) : "—"}
                    </td>
                    <td className="p-3 text-right font-medium text-foreground whitespace-nowrap">
                      {run.itemsFetched}
                    </td>
                    <td className="p-3 text-right font-medium text-foreground whitespace-nowrap">
                      {run.itemsInserted}
                    </td>
                    <td className="p-3 text-xs max-w-xs truncate text-muted-foreground">
                      {run.error ? (
                        <span className="text-red-500/80 inline-flex items-center gap-1 max-w-full" title={run.error}>
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{run.error}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
