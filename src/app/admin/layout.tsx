import { headers } from "next/headers";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminPath = (await headers()).get("x-admin-path") ?? "";
  const isLoginRoute = adminPath === "/admin/login";

  if (isLoginRoute) {
    return children;
  }

  const admin = await requireAdmin();
  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
