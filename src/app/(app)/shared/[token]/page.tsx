import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import {
  getOwnerEmail,
  getSharedProject,
} from "@/lib/shared-projects";
import { SharedProjectView } from "@/components/SharedProjectView";

// A shared bulk project. This route is NOT in the public allowlist, so the
// middleware requires the visitor to sign in (or sign up / create a password)
// before they can view it.
export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const shared = await getSharedProject(token);
  if (!shared) notFound();

  const ownerEmail = await getOwnerEmail(shared.owner_id);

  return (
    <>
      <Header
        title="Shared project"
        subtitle={
          ownerEmail
            ? `Shared with you by ${ownerEmail}`
            : "A UTM project shared with you"
        }
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <SharedProjectView name={shared.name} rows={shared.data?.rows ?? []} />
      </main>
    </>
  );
}
