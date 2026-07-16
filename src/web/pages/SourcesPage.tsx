import { Database } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function SourcesPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Ingestion Sources</h2>
        <p className="text-sm text-muted-foreground">Manage and track external feed connections.</p>
      </div>
      <EmptyState
        icon={Database}
        title="No Configured Sources"
        description="Source health, sync status, and fetch errors will appear here."
      />
    </div>
  )
}
