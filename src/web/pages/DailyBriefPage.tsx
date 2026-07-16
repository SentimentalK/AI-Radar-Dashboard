import { Sparkles } from 'lucide-react'
import EmptyState from '@/components/EmptyState'

export default function DailyBriefPage() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Intelligence Brief</h2>
        <p className="text-sm text-muted-foreground">Summarized and prioritized AI tech intelligence for the day.</p>
      </div>
      <EmptyState
        icon={Sparkles}
        title="Daily Brief Pipeline Offline"
        description="Today’s AI engineering brief will appear here after the daily brief pipeline is implemented."
      />
    </div>
  )
}
