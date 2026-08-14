import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { absoluteUrl } from "@/lib/site";

const UPDATED = "August 14, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of the Vizionality UTM Builder application.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of the Vizionality UTM Builder application (the
        &ldquo;Service&rdquo;) provided by Vizionality (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;). By creating an account or using the Service, you agree
        to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>Eligibility and accounts</h2>
      <p>
        You must be at least 13 years old to use the Service. You are
        responsible for maintaining the confidentiality of your account
        credentials and for all activity that occurs under your account. Notify
        us promptly of any unauthorized use.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful or fraudulent purpose.</li>
        <li>
          Attempt to gain unauthorized access to the Service, other accounts, or
          our systems.
        </li>
        <li>
          Interfere with or disrupt the integrity or performance of the Service.
        </li>
        <li>
          Reverse engineer or resell the Service except as permitted by law.
        </li>
        <li>
          Connect Google Analytics properties you are not authorized to access.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of the UTM links, campaign names, and other content
        you create with the Service. You are responsible for that content and
        for ensuring you have the rights to any URLs and data you process.
      </p>

      <h2>Third-party services</h2>
      <p>
        The Service integrates with third-party services including Google
        (sign-in and Google Analytics), Supabase, Vercel, and Anthropic. Your
        use of those integrations is also subject to the respective
        providers&rsquo; terms. We are not responsible for third-party services.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We may modify, suspend, or discontinue any part of the Service at any
        time. Some features may be labeled &ldquo;coming soon&rdquo; or offered
        on a trial basis and may change or be removed.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; without warranties of any kind, whether express or
        implied, including fitness for a particular purpose and
        non-infringement. We do not warrant that the Service will be
        uninterrupted, error-free, or that analytics data displayed will be
        accurate.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Vizionality will not be liable
        for any indirect, incidental, special, consequential, or punitive
        damages, or any loss of data, profits, or revenue, arising from your use
        of the Service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service at any time. We may suspend or terminate
        your access if you violate these Terms. Provisions that by their nature
        should survive termination will survive.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        reflected by updating the &ldquo;Last updated&rdquo; date above.
        Continued use of the Service after changes take effect constitutes
        acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Email us at{" "}
        <a href="mailto:admin@vizionality.com">admin@vizionality.com</a>.
      </p>
    </LegalPage>
  );
}
