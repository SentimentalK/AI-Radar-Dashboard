import { Sparkles, CheckCircle2, Circle } from 'lucide-react';

export default function DailyBriefPage() {
  const steps = [
    { name: 'Raw Ingestion', desc: 'RSS Adapter fetches raw articles and updates DB idempotently.', status: 'completed', phase: 'Phase 3' },
    { name: 'Read-only API', desc: 'Express endpoints expose SQLite datasets to the client.', status: 'completed', phase: 'Phase 4' },
    { name: 'Dashboard Timeline', desc: 'React view aggregates dates, filters, and logs.', status: 'completed', phase: 'Phase 5' },
    { name: 'LLM Content Enrichment', desc: 'Extract and tag technical properties using OpenAI/Zhipu models.', status: 'todo', phase: 'Phase 6-8' },
    { name: 'Daily Brief Generation', desc: 'Compile daily prioritized summary briefs from the database.', status: 'todo', phase: 'Phase 9' },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Intelligence Brief</h2>
        <p className="text-sm text-muted-foreground">Summarized and prioritized AI tech intelligence for the day.</p>
      </div>

      <div className="bg-card border border-border p-6 rounded-lg space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-base text-foreground">Daily Brief Pipeline Offline</h3>
        </div>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page will show one materialized daily AI engineering brief after the enrichment and brief-generation phases are implemented. Below is the progress status of the AI Radar Dashboard pipeline phases:
        </p>

        <div className="space-y-4 pt-2">
          {steps.map((step) => {
            const isDone = step.status === 'completed';
            return (
              <div key={step.name} className="flex gap-4 items-start p-3 rounded bg-background/40 border border-border/40">
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/45 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className={`font-semibold ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.name}
                    </span>
                    <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                      {step.phase}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
