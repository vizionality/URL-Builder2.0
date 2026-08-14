import { redirect } from "next/navigation";
import { Sidebar, MobileTabBar } from "@/components/Navigation";
import { OnboardingTour } from "@/components/OnboardingTour";
import { SignupTracker } from "@/components/analytics/SignupTracker";
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

  const meta = user.user_metadata ?? {};
  const profile = {
    email: user.email ?? "",
    name: (meta.full_name as string) || (meta.name as string) || "",
    avatarUrl:
      (meta.avatar_url as string) || (meta.picture as string) || null,
  };

  return (
    <div className="flex min-h-full">
      <Sidebar profile={profile} />
      <div className="flex min-h-screen flex-1 flex-col min-w-0">
        <MobileTabBar />
        {children}
      </div>
      <OnboardingTour completed={Boolean(meta.tour_completed_v1)} />
      <SignupTracker
        tracked={Boolean(meta.signup_tracked)}
        method={(user.app_metadata?.provider as string) || "email"}
        userId={user.id}
      />
    </div>
  );
}
