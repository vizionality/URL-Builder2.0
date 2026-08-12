import { Check, Minus } from "lucide-react";

export type ComparisonRow = {
  label: string;
  /** true = included, false = not included, string = qualified note. */
  us: boolean | string;
  them: boolean | string;
};

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-xs font-medium text-zinc-500">{value}</span>
    );
  }
  return value ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
      <Check size={14} />
    </span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
      <Minus size={14} />
    </span>
  );
}

export function ComparisonTable({
  rows,
  ourLabel = "UTMBuilder",
  theirLabel = "Basic single-link builders",
}: {
  rows: ComparisonRow[];
  ourLabel?: string;
  theirLabel?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="py-3 pr-4 text-sm font-semibold text-zinc-900">
              What you get
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-green-700">
              {ourLabel}
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-500">
              {theirLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-zinc-100">
              <td className="py-3 pr-4 text-sm text-zinc-700">{r.label}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Cell value={r.us} />
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center">
                  <Cell value={r.them} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
