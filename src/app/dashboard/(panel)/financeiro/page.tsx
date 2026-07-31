import { prisma } from '@/lib/prisma';
import { Wallet, Plus, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { createInvoice, deleteInvoice } from './actions';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'border-line bg-white/5 text-muted' },
  sent: { label: 'Enviada', cls: 'border-accent/40 bg-accent-soft text-accent' },
  paid: { label: 'Paga', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  overdue: { label: 'Vencida', cls: 'border-red-500/30 bg-red-500/10 text-red-400' }
};

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmt = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d) : '—';

export default async function FinanceiroPage() {
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({ orderBy: { createdAt: 'desc' }, include: { client: true } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } })
  ]);

  const sum = (pred: (s: string) => boolean) =>
    invoices.filter((i) => pred(i.status)).reduce((acc, i) => acc + i.amount, 0);

  const received = sum((s) => s === 'paid');
  const pending = sum((s) => s === 'sent' || s === 'draft');
  const overdue = sum((s) => s === 'overdue');

  const cards = [
    { label: 'Recebido', value: received, icon: TrendingUp, accent: 'text-emerald-400' },
    { label: 'A receber', value: pending, icon: Clock, accent: 'text-accent' },
    { label: 'Vencido', value: overdue, icon: AlertTriangle, accent: 'text-red-400' }
  ];

  const field =
    'rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent';

  return (
    <div>
      <div className="flex items-center gap-2">
        <Wallet size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Financeiro</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Orçamentos, faturas e recebimentos.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{label}</span>
              <Icon size={18} className={accent} />
            </div>
            <p className="mt-2 font-display text-2xl font-bold">{usd(value)}</p>
          </div>
        ))}
      </div>

      {/* Create */}
      <details className="glass mt-6 rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <Plus size={16} className="text-accent" />
          Nova fatura
        </summary>
        <form action={createInvoice} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input name="description" required placeholder="Descrição *" className={`${field} lg:col-span-2`} />
          <input name="amount" required placeholder="Valor (US$)" inputMode="decimal" className={field} />
          <select name="clientId" defaultValue="" className={field}>
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue="draft" className={field}>
            <option value="draft">Rascunho</option>
            <option value="sent">Enviada</option>
            <option value="paid">Paga</option>
            <option value="overdue">Vencida</option>
          </select>
          <input name="dueDate" type="date" className={`${field} lg:col-span-2`} />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3">
            Adicionar fatura
          </button>
        </form>
      </details>

      <div className="mt-6 glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Descrição</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Vencimento</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Valor</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    Nenhuma fatura cadastrada.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const s = STATUS[inv.status] ?? STATUS.draft;
                  return (
                    <tr key={inv.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4 font-medium">{inv.description}</td>
                      <td className="px-5 py-4 text-muted">{inv.client?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-muted">{fmt(inv.dueDate)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium">{usd(inv.amount)}</td>
                      <td className="px-5 py-4 text-right">
                        <DeleteButton
                          action={deleteInvoice}
                          id={inv.id}
                          name={`${inv.description} — ${usd(inv.amount)}`}
                          label="Excluir fatura"
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
