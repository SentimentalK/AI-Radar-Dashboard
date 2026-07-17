import type { ApiSource } from '../../shared/apiTypes';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Globe } from 'lucide-react';
import { formatDateTime } from '../lib/format';

interface SourceCardProps {
  source: ApiSource;
}

export default function SourceCard({ source }: SourceCardProps) {
  const note = (source.config.note as string) || null;

  return (
    <Card className="border-border bg-card flex flex-col h-full">
      <CardHeader className="p-4 pb-2 space-y-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="uppercase text-[9px] tracking-wider py-0 px-1 font-semibold">
            {source.type}
          </Badge>
          <div className="flex items-center gap-1">
            {source.enabled ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] py-0 px-1 font-normal inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[9px] py-0 px-1 font-normal inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                Disabled
              </Badge>
            )}
          </div>
        </div>

        <CardTitle className="text-sm font-semibold text-foreground leading-snug">
          {source.name}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
            Fetch Method
          </span>
          <code className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border inline-block">
            {source.fetchMethod}
          </code>
        </div>

        {source.url && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              Endpoint URL
            </span>
            <a 
              href={source.url} 
              target="_blank" 
              rel="noreferrer" 
              className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 max-w-full truncate"
            >
              <Globe className="h-3 w-3 shrink-0" />
              <span className="truncate">{source.url}</span>
            </a>
          </div>
        )}

        {/* Ingestion health tracking */}
        {source.lastRunStatus && (
          <div className="pt-2 border-t border-border/50 space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">
              Last Ingestion
            </span>
            <div className="flex items-center gap-2">
              {source.lastRunStatus === "success" ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] py-0 px-1 font-normal">
                  Success
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] py-0 px-1 font-normal">
                  Failed
                </Badge>
              )}
              {source.lastRunAt && (
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(source.lastRunAt)}
                </span>
              )}
            </div>
            {source.lastRunError && (
              <p className="text-[10px] text-rose-500/90 italic truncate max-w-full leading-snug">
                Error: {source.lastRunError}
              </p>
            )}
          </div>
        )}

        {note && (
          <div className="pt-2 border-t border-border/50 text-muted-foreground italic text-[11px] leading-relaxed">
            {note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
