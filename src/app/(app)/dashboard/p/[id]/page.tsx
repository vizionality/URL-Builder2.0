"use client";

import { use } from "react";
import { Header } from "@/components/Header";
import { BlankDashboard, DashboardTabs, useDashboardPages } from "@/components/dashboard/DashboardTabs";

export default function CustomDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const page = useDashboardPages().find((p) => p.id === id);
  const name = page?.name ?? "Custom page";
  return (
    <>
      <Header title="Dashboard" subtitle={name} />
      <DashboardTabs />
      {page ? (
        <BlankDashboard name={name} />
      ) : (
        <main className="flex-1 px-4 py-6 text-sm text-zinc-500 sm:px-6">This page doesn&apos;t exist in this browser.</main>
      )}
    </>
  );
}
