import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Contact, Users, KanbanSquare, Sparkles, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  won: 'Ganho',
  lost: 'Perdido'
};

export default async function OverviewPage() {
  const [leads, newLeads, clients, projects, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'new' } }),
    prisma.client.count(),
    prisma.project.count(),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  ]);

  const cards = [
    { label: 'Leads', value: leads, sub: `${newLeads} novos`, icon: Contact, href: '/dashboard/leads' },
    { label: 'Clientes', value: clients, sub: 'ativos e prospects', icon: Users, href: '/dashboard/clientes' },
    { label: 'Projetos', value: projects, sub: 'em andamento', icon: KanbanSquare, href: '/dashboard/projetos' }
  ];

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Visão geral</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Um resumo da operação da NATA STUDIOS.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, sub, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
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

      <div className="mt-8 glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Leads recentes</h2>
          <Link href="/dashboard/leads" className="text-sm text-accent hover:underline">
            Ver todos
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Nenhum lead ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((lead) => (
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
