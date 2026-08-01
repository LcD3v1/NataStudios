import { useEffect, useState } from 'react';
import { Contact, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: string;
  status: string;
  createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Novo', cls: 'border-accent/40 bg-accent-soft text-accent' },
  contacted: { label: 'Contatado', cls: 'border-line bg-white/5 text-muted' },
  won: { label: 'Ganho', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  lost: { label: 'Perdido', cls: 'border-red-500/30 bg-red-500/10 text-red-400' }
};

const fmt = (d: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(d));

export default function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  const load = () =>
    api.get<{ leads: Lead[] }>('/dashboard/leads').then((r) => setLeads(r.leads));

  useEffect(() => {
    load().catch(() => setLeads([]));
  }, []);

  async function remove(id: string) {
    await api.del(`/dashboard/leads/${id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Contact size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Leads</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Contatos recebidos pelo formulário do site.</p>

      <div className="glass mt-8 overflow-hidden rounded-2xl">
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
              {leads === null ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <Loader2 className="mx-auto animate-spin text-accent" size={20} />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted">
                    Nenhum lead ainda. Envie o formulário de contato do site para testar.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const s = STATUS[lead.status] ?? STATUS.contacted!;
                  return (
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
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-subtle">{fmt(lead.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <DeleteButton
                          onDelete={() => remove(lead.id)}
                          name={`${lead.name} (${lead.email})`}
                          label="Excluir lead"
                          compact
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
