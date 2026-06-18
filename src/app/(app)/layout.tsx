import { redirect } from "next/navigation";
import { Sidebar, MobileTabBar } from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth: middleware already redirects, but never render the
  // app shell for a logged-out visitor.
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-full">
      <Sidebar userEmail={user.email} />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <MobileTabBar />
        {children}
      </div>
    </div>
  );
}
