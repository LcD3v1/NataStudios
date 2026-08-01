import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Contact, Users, KanbanSquare, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type Lead = { id: string; name: string; email: string; status: string };
type Data = {
  counts: { leads: number; newLeads: number; clients: number; projects: number };
  recent: Lead[];
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  won: 'Ganho',
  lost: 'Perdido'
};

export default function Overview() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    api.get<Data>('/dashboard/overview').then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return <Loader2 className="animate-spin text-accent" size={24} />;
  }

  const cards = [
    {
      label: 'Leads',
      value: data.counts.leads,
      sub: `${data.counts.newLeads} novos`,
      icon: Contact,
      to: '/dashboard/leads'
    },
    {
      label: 'Clientes',
      value: data.counts.clients,
      sub: 'ativos e prospects',
      icon: Users,
      to: '/dashboard/clientes'
    },
    {
      label: 'Projetos',
      value: data.counts.projects,
      sub: 'em andamento',
      icon: KanbanSquare,
      to: '/dashboard/projetos'
    }
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Um resumo da operação da NATA STUDIOS.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, sub, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="glass group rounded-2xl p-5 transition-transform hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white/5">
                <Icon size={18} className="text-accent" />
              </span>
              <ArrowRight
                size={16}
                className="text-subtle opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            <p className="mt-4 font-display text-3xl font-bold">{value}</p>
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-xs text-subtle">{sub}</p>
          </Link>
        ))}
      </div>

      <div className="glass mt-8 rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Leads recentes</h2>
          <Link to="/dashboard/leads" className="text-sm text-accent hover:underline">
            Ver todos
          </Link>
        </div>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted">Nenhum lead ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recent.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lead.name}</p>
                  <p className="truncate text-xs text-subtle">{lead.email}</p>
                </div>
                <span className="ml-4 shrink-0 rounded-full border border-line bg-white/5 px-2.5 py-1 text-xs text-muted">
                  {STATUS_LABEL[lead.status] ?? lead.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
