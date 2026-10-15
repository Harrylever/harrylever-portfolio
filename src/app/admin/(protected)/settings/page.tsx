import type { Metadata } from "next";

import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { SettingsForm } from "@/components/admin/settings-form";
import { readSiteProfileForEditing } from "@/server/content/site-profile/admin";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const profile = await readSiteProfileForEditing(await requireAdminPage());

  return (
    <>
      <h1 className="adm-title">Settings</h1>
      <p className="adm-lede">
        Your name, introduction and contact links appear across the public site.
        Saving keeps changes private; publish when they&apos;re ready.
      </p>

      <section aria-labelledby="profile-heading" className="adm-section">
        <h2 className="adm-h2" id="profile-heading">
          Site profile
        </h2>
        <SettingsForm initial={profile} />
      </section>

      <aside aria-labelledby="credentials-heading" className="adm-note">
        <h2 className="adm-h2" id="credentials-heading">
          Sign-in details
        </h2>
        <p>
          The admin email and password come from the <code>ADMIN_EMAIL</code>{" "}
          and <code>ADMIN_PASSWORD</code> environment variables and can&apos;t
          be changed here. Change them in your hosting settings and redeploy;
          that also signs out every existing session. Rotating{" "}
          <code>ADMIN_SESSION_SECRET</code> does the same without changing the
          password.
        </p>
      </aside>
    </>
  );
}
