import { useEffect, useState } from 'react';
import { Wallet, Plus, TrendingUp, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

type Invoice = {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string | null;
  client: { name: string } | null;
};
type Client = { id: string; name: string };

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'border-line bg-white/5 text-muted' },
  sent: { label: 'Enviada', cls: 'border-accent/40 bg-accent-soft text-accent' },
  paid: { label: 'Paga', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  overdue: { label: 'Vencida', cls: 'border-red-500/30 bg-red-500/10 text-red-400' }
};

/** Values are stored as plain numbers; USD is the presentation currency. */
const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const fmt = (d: string | null) =>
  d
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(
        new Date(d)
      )
    : '—';

const EMPTY = { description: '', amount: '', clientId: '', status: 'draft', dueDate: '' };

export default function Financeiro() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const load = () =>
    api.get<{ invoices: Invoice[] }>('/dashboard/invoices').then((r) => setInvoices(r.invoices));

  useEffect(() => {
    load().catch(() => setInvoices([]));
    api
      .get<{ clients: Client[] }>('/dashboard/clients')
      .then((r) => setClients(r.clients))
      .catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    await api.post('/dashboard/invoices', form);
    setForm(EMPTY);
    await load();
  }

  async function remove(id: string) {
    await api.del(`/dashboard/invoices/${id}`);
    await load();
  }

  const sum = (pred: (s: string) => boolean) =>
    (invoices ?? []).filter((i) => pred(i.status)).reduce((acc, i) => acc + i.amount, 0);

  const cards = [
    { label: 'Recebido', value: sum((s) => s === 'paid'), icon: TrendingUp, accent: 'text-emerald-400' },
    { label: 'A receber', value: sum((s) => s === 'sent' || s === 'draft'), icon: Clock, accent: 'text-accent' },
    { label: 'Vencido', value: sum((s) => s === 'overdue'), icon: AlertTriangle, accent: 'text-red-400' }
  ];

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

      <div className="glass mt-6 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} className="text-accent" />
          Nova fatura
        </button>
        {open && (
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              required
              placeholder="Descrição *"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="field lg:col-span-2"
            />
            <input
              required
              placeholder="Valor (US$)"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="field"
            />
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              className="field"
            >
              <option value="">Sem cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="field"
            >
              <option value="draft">Rascunho</option>
              <option value="sent">Enviada</option>
              <option value="paid">Paga</option>
              <option value="overdue">Vencida</option>
            </select>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="field lg:col-span-2"
            />
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3">
              Adicionar fatura
            </button>
          </form>
        )}
      </div>

      <div className="glass mt-6 overflow-hidden rounded-2xl">
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
              {invoices === null ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Loader2 className="mx-auto animate-spin text-accent" size={20} />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted">
                    Nenhuma fatura cadastrada.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const s = STATUS[inv.status] ?? STATUS.draft!;
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
                          onDelete={() => remove(inv.id)}
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
