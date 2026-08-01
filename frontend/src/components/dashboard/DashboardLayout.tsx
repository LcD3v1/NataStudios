import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Contact,
  Users,
  KanbanSquare,
  Megaphone,
  Wallet,
  ShieldCheck,
  Lock,
  LogOut,
  Loader2,
  Menu,
  X,
  type LucideIcon
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { api } from '@/lib/api';
import { clsx } from '@/lib/clsx';

export type Me = {
  email: string;
  name: string;
  role: string;
  totpEnabled: boolean;
  enrollingSecret: string | null;
  enrollingUri: string | null;
};

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/dashboard/leads', label: 'Leads', icon: Contact },
  { to: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { to: '/dashboard/projetos', label: 'Projetos', icon: KanbanSquare },
  { to: '/dashboard/marketing', label: 'Marketing', icon: Megaphone },
  { to: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/dashboard/auditoria', label: 'Auditoria', icon: ShieldCheck },
  { to: '/dashboard/seguranca', label: 'Segurança', icon: Lock }
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // The server is the authority — this only decides what to render.
  useEffect(() => {
    api
      .get<{ user: Me }>('/auth/me')
      .then((r) => setMe(r.user))
      .catch(() => navigate('/dashboard/login', { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    navigate('/dashboard/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }
  if (!me) return null;

  const links = NAV.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
          isActive ? 'bg-accent-soft text-white' : 'text-muted hover:bg-white/5 hover:text-white'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={isActive ? 'text-accent' : ''} />
          {label}
        </>
      )}
    </NavLink>
  ));

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-ink-2/60 p-4 md:flex">
        <div className="px-2 py-3">
          <Logo height={30} />
        </div>
        <nav className="mt-6 flex flex-col gap-1">{links}</nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-line bg-ink/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line text-white md:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="ml-auto text-right">
            <p className="text-sm font-medium leading-tight">{me.name}</p>
            <p className="text-xs text-subtle">{me.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-white"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

        {/* Mobile drawer */}
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-b border-line bg-ink-2 p-4 md:hidden">
            {links}
          </nav>
        )}

        <main className="flex-1 p-4 sm:p-8">
          <Outlet context={{ me }} />
        </main>
      </div>
    </div>
  );
}
