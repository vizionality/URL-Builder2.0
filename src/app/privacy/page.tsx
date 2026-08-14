import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";
import { absoluteUrl } from "@/lib/site";

const UPDATED = "August 14, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Vizionality UTM Builder collects, uses, and protects your data.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains how Vizionality (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;) collects, uses, and protects information when you use
        the Vizionality UTM Builder application (the &ldquo;Service&rdquo;). By
        using the Service you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <h3>Account information</h3>
      <p>
        When you create an account we collect your email address and, if you
        sign in with Google, your name and profile picture as provided by
        Google. If you register with email and password, your password is
        stored in hashed form by our authentication provider (Supabase) and is
        never visible to us.
      </p>
      <h3>Content you create</h3>
      <p>
        UTM links, campaign names, projects, and related options you build in
        the Service are stored in your browser&rsquo;s local storage on your
        device and, where applicable, associated with your account. This
        content is what the Service exists to help you produce.
      </p>
      <h3>Google Analytics data</h3>
      <p>
        If you connect a Google Analytics 4 property, we access your analytics
        data on a <strong>read-only</strong> basis (the{" "}
        <code>analytics.readonly</code> scope) solely to display session and
        engagement metrics for your campaigns inside the Service. We do not
        modify your Google Analytics configuration, and we do not use this data
        for any purpose other than showing it back to you.
      </p>
      <h3>AI suggestions</h3>
      <p>
        The optional &ldquo;AI Initiative Suggestions&rdquo; feature sends the
        campaign description you type to our AI provider (Anthropic) to generate
        naming suggestions. Do not include sensitive personal information in
        those descriptions.
      </p>
      <h3>Usage and analytics</h3>
      <p>
        We may use analytics and tag-management tools (such as Google Analytics
        and Google Tag Manager) to understand how the Service is used and to
        measure sign-ups and feature usage. These tools may set cookies as
        described below.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To provide, operate, and maintain the Service.</li>
        <li>To authenticate you and keep your session secure.</li>
        <li>To display your campaigns and connected analytics data.</li>
        <li>To improve features and understand product usage.</li>
        <li>To communicate with you about your account or the Service.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use cookies that are strictly necessary to keep you signed in
        (session cookies set by our authentication provider), and, where
        enabled, analytics cookies to measure usage. You can control cookies
        through your browser settings; disabling necessary cookies will prevent
        you from signing in.
      </p>

      <h2>How we share information</h2>
      <p>
        We do not sell your personal information. We share information only with
        service providers that help us operate the Service, under agreements
        that require them to protect it:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — authentication and database hosting.
        </li>
        <li>
          <strong>Vercel</strong> — application hosting.
        </li>
        <li>
          <strong>Google</strong> — sign-in and, if you connect it, Google
          Analytics data access.
        </li>
        <li>
          <strong>Anthropic</strong> — processing AI suggestion requests.
        </li>
      </ul>
      <p>
        We may also disclose information if required by law or to protect our
        rights and the safety of our users.
      </p>

      <h2>Google API disclosure</h2>
      <p>
        Vizionality UTM Builder&rsquo;s use and transfer of information received
        from Google APIs adheres to the{" "}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We only request read-only
        access to Google Analytics data, use it exclusively to provide
        user-facing features, and do not transfer or use it for advertising.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain your account information for as long as your account is
        active. Content stored in your browser&rsquo;s local storage remains
        until you clear it. You may request deletion of your account and
        associated data at any time (see Contact below).
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct,
        export, or delete your personal information, and to withdraw consent for
        connected services (for example, by disconnecting Google Analytics). To
        exercise these rights, contact us using the details below.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not
        knowingly collect information from them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be reflected by updating the &ldquo;Last updated&rdquo; date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data? Email us at{" "}
        <a href="mailto:admin@vizionality.com">admin@vizionality.com</a>.
      </p>
    </LegalPage>
  );
}
