import { redirect } from "next/navigation";
import { Sidebar, MobileTabBar } from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/lib/workspace-context";

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

  const meta = user.user_metadata ?? {};
  const profile = {
    email: user.email ?? "",
    name: (meta.full_name as string) || (meta.name as string) || "",
    avatarUrl:
      (meta.avatar_url as string) || (meta.picture as string) || null,
  };

  return (
    <WorkspaceProvider>
      <div className="flex min-h-full">
        <Sidebar profile={profile} />
        <div className="flex min-h-screen flex-1 flex-col min-w-0">
          <MobileTabBar />
          {children}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
