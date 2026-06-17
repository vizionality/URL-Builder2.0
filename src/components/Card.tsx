export function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      {title && <h2 className="text-base font-semibold text-zinc-900">{title}</h2>}
      {description && (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      )}
      <div className={title ? "mt-4" : undefined}>{children}</div>
    </div>
  );
}
