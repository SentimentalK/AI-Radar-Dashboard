import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { getTimeline } from '../lib/api';
import type { ApiTimelineGroup, ApiItem } from '../../shared/apiTypes';
import TimelineFilters from '../components/TimelineFilters';
import TimelineGroup from '../components/TimelineGroup';
import ItemDetailDrawer from '../components/ItemDetailDrawer';
import EmptyState from '@/components/EmptyState';
import { Button } from '../components/ui/button';

export default function TimelinePage() {
  const [groups, setGroups] = useState<ApiTimelineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [days, setDays] = useState(7);
  const [sourceType, setSourceType] = useState('');
  
  // Detail Drawer state
  const [selectedItem, setSelectedItem] = useState<ApiItem | null>(null);

  const fetchTimelineData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTimeline({
        days,
        sourceType: sourceType || undefined,
      });
      setGroups(data.groups);
    } catch (err) {
      console.error("Failed to load timeline:", err);
      setError("Could not load timeline. Check that the API is running and the database has been initialized.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [days, sourceType]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Activity Timeline</h2>
          <p className="text-sm text-muted-foreground">Materialized source items grouped by publish or fetch date.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchTimelineData}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter panel */}
      <TimelineFilters 
        days={days} 
        setDays={setDays} 
        sourceType={sourceType} 
        setSourceType={setSourceType} 
      />

      {/* States */}
      {loading ? (
        <div className="space-y-6 pt-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <div className="h-6 w-32 bg-secondary/50 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-32 bg-secondary/20 rounded-lg border border-border/50 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 bg-card rounded-lg border border-border p-6">
          <Clock className="h-8 w-8 text-destructive" />
          <h3 className="font-semibold text-base text-foreground">Error Loading Timeline</h3>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTimelineData} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No Items Found"
          description="No source items match the selected filters. Run npm run sync in your workspace root to pull recent feed updates."
        />
      ) : (
        <div className="space-y-8 pt-2">
          {groups.map((group) => (
            <TimelineGroup 
              key={group.date} 
              group={group} 
              onOpenItem={(item) => setSelectedItem(item)} 
            />
          ))}
        </div>
      )}

      {/* Detail slide-over drawer */}
      <ItemDetailDrawer 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
      />
    </div>
  );
}
