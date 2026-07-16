import { FileText, Clock, Rss, Radar, Activity } from 'lucide-react';

interface SidebarProps {
  activeTab: 'brief' | 'timeline' | 'sources' | 'runs';
  setActiveTab: (tab: 'brief' | 'timeline' | 'sources' | 'runs') => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const navItems = [
    { id: 'brief', label: 'Daily Brief', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'sources', label: 'Sources', icon: Rss },
    { id: 'runs', label: 'Sync Runs', icon: Activity },
  ] as const;

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <Radar className="h-5 w-5 text-foreground animate-pulse" />
        <span className="font-semibold text-base tracking-wider text-foreground">AI RADAR</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border bg-background/50">
        <div className="text-xs text-muted-foreground">
          AI Radar Dashboard
        </div>
        <div className="text-[10px] text-muted-foreground/60 mt-0.5">
          v0.5.0 — Phase 5
        </div>
      </div>
    </aside>
  );
}
