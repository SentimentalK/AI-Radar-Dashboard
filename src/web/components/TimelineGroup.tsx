import type { ApiTimelineGroup, ApiItem } from '../../shared/apiTypes';
import ItemCard from './ItemCard';
import { formatDate } from '../lib/format';

interface TimelineGroupProps {
  group: ApiTimelineGroup;
  onOpenItem: (item: ApiItem) => void;
}

export default function TimelineGroup({ group, onOpenItem }: TimelineGroupProps) {
  return (
    <div className="space-y-4">
      {/* Date Divider */}
      <div className="flex items-center gap-4">
        <h3 className="text-sm font-semibold text-foreground shrink-0 bg-background/50 py-1 pr-2 rounded">
          {formatDate(group.date)}
        </h3>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {group.items.map((item) => (
          <ItemCard key={item.id} item={item} onOpen={onOpenItem} />
        ))}
      </div>
    </div>
  );
}
