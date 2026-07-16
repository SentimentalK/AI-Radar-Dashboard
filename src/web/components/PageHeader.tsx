import { Badge } from '@/components/ui/badge'

interface PageHeaderProps {
  title: string
  apiStatus: 'checking' | 'connected' | 'disconnected'
}

export default function PageHeader({ title, apiStatus }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
      <h1 className="font-semibold text-lg text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">API Connection:</span>
        {apiStatus === 'checking' && (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 gap-1.5 py-0.5 font-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Checking
          </Badge>
        )}
        {apiStatus === 'connected' && (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 py-0.5 font-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Connected
          </Badge>
        )}
        {apiStatus === 'disconnected' && (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5 py-0.5 font-normal">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            Disconnected
          </Badge>
        )}
      </div>
    </header>
  )
}
