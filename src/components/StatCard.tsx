export function StatCard({
  label,
  value,
  sublabel,
  sample,
}: {
  label: string;
  value: string;
  sublabel?: string;
  sample?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
      {sublabel && (
        <p
          className={`mt-1 text-xs ${
            sample ? "text-amber-600" : "text-zinc-400"
          }`}
        >
          {sublabel}
        </p>
      )}
    </div>
  );
}
