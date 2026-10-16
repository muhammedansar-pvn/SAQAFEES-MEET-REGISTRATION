import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminNav } from "./AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // If no session and not on the login page (handled by layout conditional)
  // Note: in Next.js App Router, layout wraps all sub-routes.
  // For admin/login, we bypass the nav if session is null.
  return (
    <div className="min-h-screen bg-white text-[#132238] flex flex-col">
      {session && <AdminNav user={session} />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
