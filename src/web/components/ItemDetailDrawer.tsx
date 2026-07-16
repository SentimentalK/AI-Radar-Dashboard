import { X, ExternalLink, Info } from 'lucide-react';
import type { ApiItem } from '../../shared/apiTypes';
import { formatDateTime, formatDate } from '../lib/format';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface ItemDetailDrawerProps {
  item: ApiItem | null;
  onClose: () => void;
}

export default function ItemDetailDrawer({ item, onClose }: ItemDetailDrawerProps) {
  if (!item) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="uppercase text-[10px] tracking-wider py-0 px-1.5 font-semibold">
                {item.sourceType}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                  {item.category}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold leading-tight text-foreground mt-2">{item.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 ml-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 pb-8">
            {/* Metadata Info */}
            <div className="grid grid-cols-2 gap-4 bg-background/50 p-4 rounded-lg border border-border/50 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground block">Source</span>
                <span className="font-medium text-foreground">{item.sourceName || item.sourceId}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">Original Link</span>
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-medium text-primary hover:underline inline-flex items-center gap-1.5"
                >
                  Visit source <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">Published Date</span>
                <span className="font-medium text-foreground">{formatDate(item.publishedAt)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground block">Fetched Date</span>
                <span className="font-medium text-foreground">{formatDateTime(item.fetchedAt)}</span>
              </div>
            </div>

            {/* AI Summary / Excerpt Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Summary</h3>
              <p className="text-sm text-foreground leading-relaxed">
                {item.oneLineSummary || item.rawExcerpt || "No summary available yet."}
              </p>
            </div>

            <Separator />

            {/* Future Enrichment Section (Not Enriched Yet) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">AI Enrichment Details</h3>
                <Badge variant="outline" className="bg-yellow-500/5 text-yellow-500/80 border-yellow-500/20 text-[9px] py-0 px-1 font-normal">
                  Pre-Enrichment Phase
                </Badge>
              </div>

              <div className="p-4 rounded-lg border border-yellow-500/10 bg-yellow-500/5 flex gap-3 text-xs text-yellow-500/95 leading-normal">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  This item was successfully ingested into SQLite but has not been processed by the LLM enrichment pipeline yet. 
                  Enriched properties (technical architecture, limitations, engineering relevance) will appear after the LLM pipeline phase is implemented.
                </div>
              </div>

              {/* Muted placeholder items */}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground/60">
                <div className="space-y-1 bg-background/20 p-3 rounded border border-border/20">
                  <span className="font-semibold block text-[10px] uppercase text-muted-foreground/80">What it is</span>
                  <span>Not enriched yet</span>
                </div>
                <div className="space-y-1 bg-background/20 p-3 rounded border border-border/20">
                  <span className="font-semibold block text-[10px] uppercase text-muted-foreground/80">Problem it solves</span>
                  <span>Not enriched yet</span>
                </div>
                <div className="space-y-1 bg-background/20 p-3 rounded border border-border/20">
                  <span className="font-semibold block text-[10px] uppercase text-muted-foreground/80">Advantages</span>
                  <span>Not enriched yet</span>
                </div>
                <div className="space-y-1 bg-background/20 p-3 rounded border border-border/20">
                  <span className="font-semibold block text-[10px] uppercase text-muted-foreground/80">Limitations</span>
                  <span>Not enriched yet</span>
                </div>
              </div>
            </div>

            {/* Raw Excerpt & Content Preview */}
            {(item.rawExcerpt || item.rawContent) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Raw Excerpt / Content</h3>
                  {item.rawExcerpt && (
                    <div className="bg-background/80 p-4 rounded-md border border-border text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {item.rawExcerpt}
                    </div>
                  )}
                  {item.rawContent && (
                    <div className="bg-background/80 p-4 rounded-md border border-border text-xs font-mono text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {item.rawContent.slice(0, 1000) + (item.rawContent.length > 1000 ? "\n\n...[truncated preview]..." : "")}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
