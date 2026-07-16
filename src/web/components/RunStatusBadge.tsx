import { Badge } from './ui/badge';

interface RunStatusBadgeProps {
  status: string;
}

export default function RunStatusBadge({ status }: RunStatusBadgeProps) {
  switch (status) {
    case 'success':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-normal gap-1 py-0.5">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          Success
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-normal gap-1 py-0.5">
          <span className="h-1 w-1 rounded-full bg-red-500" />
          Failed
        </Badge>
      );
    case 'partial':
      return (
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] font-normal gap-1 py-0.5">
          <span className="h-1 w-1 rounded-full bg-yellow-500 animate-pulse" />
          Partial
        </Badge>
      );
    case 'running':
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-normal gap-1 py-0.5">
          <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
          Running
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground border-border text-[10px] font-normal py-0.5">
          {status}
        </Badge>
      );
  }
}
