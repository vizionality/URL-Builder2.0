import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspacePlan } from "@/lib/billing";

function customerIdOf(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();

  async function setPlanForCustomer(
    customerId: string,
    plan: WorkspacePlan,
    subscriptionId: string | null
  ) {
    await admin
      .from("workspaces")
      .update({ plan, stripe_subscription_id: subscriptionId })
      .eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const plan = session.metadata?.plan as WorkspacePlan | undefined;
      const customerId = customerIdOf(session.customer);
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      if (customerId && plan) {
        await setPlanForCustomer(customerId, plan, subscriptionId);
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = customerIdOf(subscription.customer);
      const priceId = subscription.items.data[0]?.price.id ?? null;
      const isActive = subscription.status === "active" || subscription.status === "trialing";
      const plan = isActive ? planFromPriceId(priceId) : "free";
      if (customerId && plan) {
        await setPlanForCustomer(customerId, plan, subscription.id);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = customerIdOf(subscription.customer);
      if (customerId) {
        await setPlanForCustomer(customerId, "free", null);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
