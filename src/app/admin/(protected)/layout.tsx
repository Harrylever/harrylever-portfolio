import { requireAdminPage } from "@/app/admin/_lib/require-admin-page";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

/**
 * Gate for every page under /admin except sign-in. Pages and server actions
 * still check the session themselves; this layout is not the only check.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminPage();

  return (
    <AdminShell email={session.user.email} userId={session.user.id}>
      {children}
    </AdminShell>
  );
}
