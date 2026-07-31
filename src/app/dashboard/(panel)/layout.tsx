import { redirect } from 'next/navigation';
import { getVerifiedSession } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

export default async function PanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Zero Trust: the middleware only checks the token signature; here we confirm
  // against the database that the user exists and the session wasn't revoked.
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-end gap-4 border-b border-line bg-ink/70 px-6 backdrop-blur-xl">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{session.name}</p>
            <p className="text-xs text-subtle">{session.email}</p>
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
