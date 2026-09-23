export function LoadingState({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="card p-10 text-center text-muted">
      <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-line border-t-gold" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="card p-10 text-center">
      <p className="text-xl font-extrabold text-navy">{title}</p>
      {description && <p className="text-muted mt-2">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-6 border-danger/30 text-danger font-bold">
      {message}
    </div>
  );
}
