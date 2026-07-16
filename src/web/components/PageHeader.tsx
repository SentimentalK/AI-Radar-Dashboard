interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between shrink-0">
      <h1 className="font-semibold text-lg text-foreground">{title}</h1>
    </header>
  );
}
