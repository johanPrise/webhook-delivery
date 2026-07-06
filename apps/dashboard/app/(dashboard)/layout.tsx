import Link from "next/link";
import { getApiKey } from "@/lib/session";
import { getApplication } from "@/lib/api";
import { logout } from "@/app/actions/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await getApiKey(); // redirige vers /login si absent (voir lib/session.ts)
  const application = await getApplication();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{application.name}</span>
          <nav className="flex gap-4 text-sm text-black/70">
            <Link href="/events" className="hover:text-black">
              Événements
            </Link>
            <Link href="/endpoints" className="hover:text-black">
              Endpoints
            </Link>
            <Link href="/settings" className="hover:text-black">
              Réglages
            </Link>
          </nav>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-black/50 hover:text-red-600">
            Se déconnecter
          </button>
        </form>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
