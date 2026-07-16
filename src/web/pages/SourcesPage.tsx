import { useEffect, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { getSources } from '../lib/api';
import type { ApiSource } from '../../shared/apiTypes';
import SourceCard from '../components/SourceCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '../components/ui/button';

export default function SourcesPage() {
  const [sources, setSources] = useState<ApiSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const fetchSourcesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const enabledParam = 
        enabledFilter === 'enabled' ? true : 
        enabledFilter === 'disabled' ? false : 
        undefined;
      const data = await getSources({ enabled: enabledParam });
      setSources(data.sources);
    } catch (err) {
      console.error("Failed to load sources:", err);
      setError("Could not load sources configuration. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSourcesData();
  }, [enabledFilter]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Ingestion Sources</h2>
          <p className="text-sm text-muted-foreground">Monitor and track external feed connection configurations.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchSourcesData}
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
            Status Filter
          </span>
          <select
            value={enabledFilter}
            onChange={(e) => setEnabledFilter(e.target.value as any)}
            className="bg-background border border-border text-foreground text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Sources</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-secondary/20 rounded-lg border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-card rounded-lg border border-border p-6">
          <Database className="h-8 w-8 text-destructive" />
          <h3 className="font-semibold text-base text-foreground">Error Loading Sources</h3>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSourcesData} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No Sources Configured"
          description="Seeded sources list is missing. Run npm run db:seed in your workspace root."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {sources.map((src) => (
            <SourceCard key={src.id} source={src} />
          ))}
        </div>
      )}
    </div>
  );
}
