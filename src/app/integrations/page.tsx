"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { downloadCsv } from "@/lib/csv";
import { useGa4PropertyId } from "@/lib/storage";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

function Ga4PropertyForm({
  initialValue,
  serviceAccountEmail,
  emailError,
  onSave,
  onClear,
}: {
  initialValue: string;
  serviceAccountEmail: string | null;
  emailError: string | null;
  onSave: (value: string) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(initialValue);
  const [savedFeedback, setSavedFeedback] = useState(false);

  function handleSave() {
    onSave(draft.trim());
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  }

  function handleClear() {
    setDraft("");
    onClear();
  }

  return (
    <>
      <div>
        <label className={labelClass} htmlFor="propertyId">
          GA4 Property ID
        </label>
        <input
          id="propertyId"
          className={inputClass}
          type="text"
          inputMode="numeric"
          placeholder="123456789"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        />
        <p className="mt-1 text-xs text-zinc-400">
          Use the numeric Property ID from GA4 Admin, not the Measurement ID.
        </p>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
        <p className="text-sm font-medium text-zinc-700">Service account</p>
        {serviceAccountEmail ? (
          <p className="mt-1 break-all font-mono text-xs text-zinc-900">
            {serviceAccountEmail}
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-600">{emailError}</p>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Add this email as a Viewer in GA4 Admin &gt; Property Access Management.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          {savedFeedback ? "Saved!" : "Save Settings"}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Clear
        </button>
      </div>
    </>
  );
}

export default function IntegrationsPage() {
  const [propertyId, setPropertyId] = useGa4PropertyId();
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ga4/service-account")
      .then((res) => res.json())
      .then((data) => {
        if (data.email) {
          setServiceAccountEmail(data.email);
        } else {
          setEmailError(data.error ?? "GA4 service account is not configured.");
        }
      })
      .catch(() => setEmailError("Failed to load service account details."));
  }, []);

  function handleExport() {
    downloadCsv("ga4-integration.csv", [
      { propertyId, serviceAccountEmail: serviceAccountEmail ?? "" },
    ]);
  }

  return (
    <>
      <Header
        title="Integrations"
        subtitle="Connect external data sources"
        onExport={handleExport}
        onSave={() => {}}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Card
          title="Google Analytics 4"
          description="Connect a GA4 property to pull real Clicks and Engagement Rate metrics."
        >
          <div className="space-y-4">
            <Ga4PropertyForm
              key={propertyId}
              initialValue={propertyId}
              serviceAccountEmail={serviceAccountEmail}
              emailError={emailError}
              onSave={setPropertyId}
              onClear={() => setPropertyId("")}
            />
          </div>
        </Card>
      </main>
    </>
  );
}
