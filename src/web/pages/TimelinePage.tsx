import { Clock } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function TimelinePage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Activity Timeline</h2>
        <p className="text-sm text-muted-foreground">Historical list of AI research papers, model releases, and news.</p>
      </div>
      <EmptyState
        icon={Clock}
        title="No Items Synced Yet"
        description="AI papers, official updates, repos, and blog posts will be grouped by date here."
      />
    </div>
  )
}
