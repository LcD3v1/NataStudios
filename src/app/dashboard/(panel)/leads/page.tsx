import { prisma } from '@/lib/prisma';
import { Contact } from 'lucide-react';
import { DeleteButton } from '@/components/dashboard/DeleteButton';
import { deleteLead } from './actions';

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  new: 'border-accent/40 bg-accent-soft text-accent',
  contacted: 'border-line bg-white/5 text-muted',
  won: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  lost: 'border-red-500/30 bg-red-500/10 text-red-400'
};
const STATUS_LABEL: Record<string, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  won: 'Ganho',
  lost: 'Perdido'
};

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d);
}

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Contact size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Leads</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Contatos recebidos pelo formulário do site.
      </p>

      <div className="mt-8 glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Contato</th>
                <th className="px-5 py-3 font-medium">Mensagem</th>
                <th className="px-5 py-3 font-medium">Origem</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted">
                    Nenhum lead ainda. Envie o formulário de contato do site para testar.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="align-top hover:bg-white/[0.02]">
                    <td className="px-5 py-4 font-medium">{lead.name}</td>
                    <td className="px-5 py-4 text-muted">
                      <div>{lead.email}</div>
                      {lead.phone && <div className="text-xs text-subtle">{lead.phone}</div>}
                    </td>
                    <td className="max-w-xs px-5 py-4 text-muted">
                      <p className="line-clamp-2">{lead.message ?? '—'}</p>
                    </td>
                    <td className="px-5 py-4 text-muted">{lead.source}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          STATUS_STYLE[lead.status] ?? STATUS_STYLE.contacted
                        }`}
                      >
                        {STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-subtle">{formatDate(lead.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <DeleteButton
                        action={deleteLead}
                        id={lead.id}
                        name={`${lead.name} (${lead.email})`}
                        label="Excluir lead"
                        compact
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
