import { useEffect, useState } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

type Client = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  _count: { projects: number };
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  prospect: 'Prospect'
};

const EMPTY = { name: '', company: '', email: '', phone: '', status: 'prospect' };

export default function Clientes() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<{ clients: Client[] }>('/dashboard/clients').then((r) => setClients(r.clients));

  useEffect(() => {
    load().catch(() => setClients([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post('/dashboard/clients', form);
      setForm(EMPTY);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api.del(`/dashboard/clients/${id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Clientes</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Cadastro e status dos clientes.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-subtle">
                <tr>
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Projetos</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clients === null ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center">
                      <Loader2 className="mx-auto animate-spin text-accent" size={20} />
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-muted">
                      Nenhum cliente cadastrado.
                    </td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <div className="font-medium">{c.name}</div>
                        {c.company && <div className="text-xs text-subtle">{c.company}</div>}
                      </td>
                      <td className="px-5 py-4 text-muted">
                        <div>{c.email ?? '—'}</div>
                        {c.phone && <div className="text-xs text-subtle">{c.phone}</div>}
                      </td>
                      <td className="px-5 py-4 text-muted">{c._count.projects}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-line bg-white/5 px-2.5 py-1 text-xs text-muted">
                          {STATUS_LABEL[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <DeleteButton
                          onDelete={() => remove(c.id)}
                          name={c.name}
                          label="Excluir cliente"
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

        <form onSubmit={create} className="glass h-fit rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Plus size={16} className="text-accent" />
            Novo cliente
          </h2>
          <div className="mt-4 space-y-3">
            <input
              required
              placeholder="Nome *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field"
            />
            <input
              placeholder="Empresa"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="field"
            />
            <input
              type="email"
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="field"
            />
            <input
              placeholder="Telefone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="field"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="field"
            >
              <option value="prospect">Prospect</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Adicionar'}
          </button>
        </form>
      </div>
    </div>
  );
}
