type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const PageHeader = ({ eyebrow, title, description, action }: Props) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
    <div className="min-w-0 flex-1">
      {eyebrow && (
        <div className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-1.5 truncate">{eyebrow}</div>
      )}
      <h1 className="font-display text-3xl sm:text-4xl md:text-6xl text-foreground leading-tight sm:leading-none break-words">{title}</h1>
      {description && <p className="text-muted-foreground text-sm sm:text-base mt-2 sm:mt-3 max-w-2xl">{description}</p>}
    </div>
    {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
  </div>
);
