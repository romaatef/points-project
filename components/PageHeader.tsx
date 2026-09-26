export function PageHeader({
  title,
  subtitle,
  actions,
  titleClassName = "",
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className={`text-3xl font-extrabold text-navy ${titleClassName}`}>{title}</h1>
        {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
