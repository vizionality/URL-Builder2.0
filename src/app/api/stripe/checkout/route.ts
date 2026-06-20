import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import type { WorkspacePlan } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const { workspaceId, plan } = (await req.json()) as {
    workspaceId?: string;
    plan?: WorkspacePlan;
  };

  if (!workspaceId || (plan !== "pro" && plan !== "team")) {
    return NextResponse.json({ error: "workspaceId and a valid plan are required." }, { status: 400 });
  }

  const priceId = STRIPE_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Stripe is not configured for this plan." }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || membership?.role !== "owner") {
    return NextResponse.json({ error: "Only the workspace owner can manage billing." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id, name, stripe_customer_id")
    .eq("id", workspaceId)
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  let customerId: string | null = workspace.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: workspace.name,
      metadata: { workspace_id: workspaceId },
    });
    customerId = customer.id;
    await admin.from("workspaces").update({ stripe_customer_id: customerId }).eq("id", workspaceId);
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    metadata: { workspace_id: workspaceId, plan },
    subscription_data: { metadata: { workspace_id: workspaceId, plan } },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
