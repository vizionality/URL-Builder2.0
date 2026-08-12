import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CampaignCTA({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-xl rounded-2xl border border-green-100 bg-green-50 p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
          <Link
            href="/sign-up"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700"
          >
            Start building free
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-green-700 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
