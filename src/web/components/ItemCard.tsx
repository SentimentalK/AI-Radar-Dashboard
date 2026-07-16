import type { ApiItem } from '../../shared/apiTypes';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatDate } from '../lib/format';
import { Calendar, Flame } from 'lucide-react';

interface ItemCardProps {
  item: ApiItem;
  onOpen: (item: ApiItem) => void;
}

export default function ItemCard({ item, onOpen }: ItemCardProps) {
  const displaySummary = item.oneLineSummary || item.rawExcerpt || "No summary available yet.";
  
  return (
    <Card 
      className="cursor-pointer hover:bg-secondary/35 border-border transition-all duration-200 group relative flex flex-col h-full bg-card"
      onClick={() => onOpen(item)}
    >
      <CardHeader className="p-4 pb-2 space-y-2 flex-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground max-w-[140px] truncate">
              {item.sourceName || item.sourceId}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(item.publishedAt || item.fetchedAt)}
            </span>
          </div>
          <Badge variant="secondary" className="uppercase text-[9px] tracking-wider py-0 px-1 font-semibold">
            {item.sourceType}
          </Badge>
        </div>

        <CardTitle className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {item.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {displaySummary}
        </p>

        {/* Action / Category / Relevance score badges */}
        {(item.category || item.recommendedAction || item.engineeringRelevanceScore !== null) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {item.category && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                {item.category}
              </Badge>
            )}
            {item.recommendedAction && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/20 bg-primary/5 text-foreground font-normal">
                {item.recommendedAction}
              </Badge>
            )}
            {item.engineeringRelevanceScore !== null && (
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-orange-500/20 bg-orange-500/5 text-orange-500 font-normal inline-flex items-center gap-1">
                <Flame className="h-2.5 w-2.5" />
                {item.engineeringRelevanceScore}/10
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
