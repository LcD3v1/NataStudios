'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Contact,
  Users,
  KanbanSquare,
  Megaphone,
  Wallet,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { clsx } from '@/lib/clsx';

type NavItem = { href: string; label: string; icon: LucideIcon; soon?: boolean };

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', icon: Contact },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/projetos', label: 'Projetos', icon: KanbanSquare },
  { href: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/dashboard/auditoria', label: 'Auditoria', icon: ShieldCheck }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-ink-2/60 p-4 md:flex">
      <div className="px-2 py-3">
        <Logo height={30} />
      </div>

      <nav className="mt-6 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, soon }) => {
          const active =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                active
                  ? 'bg-accent-soft text-white'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={18} className={active ? 'text-accent' : ''} />
              <span className="flex-1">{label}</span>
              {soon && (
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[0.6rem] text-subtle">
                  em breve
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
