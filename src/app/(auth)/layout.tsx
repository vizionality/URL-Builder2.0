import { AuthBrandPanel } from "@/components/auth/AuthBrandPanel";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Form column */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 sm:px-8 lg:w-1/2">
        {children}
      </div>

      {/* Branded promo column (desktop only) */}
      <AuthBrandPanel />
    </div>
  );
}
