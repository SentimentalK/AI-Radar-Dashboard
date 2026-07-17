import { Search } from 'lucide-react';

interface TimelineFiltersProps {
  days: number;
  setDays: (days: number) => void;
  sourceType: string;
  setSourceType: (type: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function TimelineFilters({
  days,
  setDays,
  sourceType,
  setSourceType,
  searchQuery,
  setSearchQuery,
}: TimelineFiltersProps) {
  const sourceTypes = [
    { value: '', label: 'All Sources' },
    { value: 'paper', label: 'arXiv Papers' },
    { value: 'official', label: 'Official Updates' },
    { value: 'repo', label: 'GitHub Repositories' },
    { value: 'blog', label: 'Engineering Blogs' },
    { value: 'community', label: 'Community News' },
  ];

  const daysOptions = [
    { value: 7, label: 'Last 7 Days' },
    { value: 14, label: 'Last 14 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 90, label: 'Last 90 Days' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border border-border">
      <div className="flex flex-col gap-1.5 shrink-0">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
          Source Type
        </label>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="bg-background border border-border text-foreground text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {sourceTypes.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
          Time Window
        </label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-background border border-border text-foreground text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {daysOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
        <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search titles, abstracts, or sources..."
            className="w-full bg-background border border-border text-foreground text-xs rounded pl-8 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
    </div>
  );
}
