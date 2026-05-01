type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const PageHeader = ({ eyebrow, title, description, action }: Props) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
    <div>
      {eyebrow && (
        <div className="text-xs uppercase tracking-[0.3em] text-accent font-bold mb-2">{eyebrow}</div>
      )}
      <h1 className="font-display text-5xl md:text-6xl text-foreground leading-none">{title}</h1>
      {description && <p className="text-muted-foreground mt-3 max-w-2xl">{description}</p>}
    </div>
    {action}
  </div>
);
