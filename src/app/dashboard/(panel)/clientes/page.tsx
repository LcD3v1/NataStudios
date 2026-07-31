import { prisma } from '@/lib/prisma';
import { Users, Plus } from 'lucide-react';
import { createClient, deleteClient } from './actions';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  prospect: 'Prospect'
};

export default async function ClientesPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { projects: true } } }
  });

  const field =
    'w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent';

  return (
    <div>
      <div className="flex items-center gap-2">
        <Users size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Clientes</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Cadastro e status dos clientes.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* List */}
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
                {clients.length === 0 ? (
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
                        {c.company && (
                          <div className="text-xs text-subtle">{c.company}</div>
                        )}
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
                          action={deleteClient}
                          id={c.id}
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

        {/* Create form */}
        <form action={createClient} className="glass h-fit rounded-2xl p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold">
            <Plus size={16} className="text-accent" />
            Novo cliente
          </h2>
          <div className="mt-4 space-y-3">
            <input name="name" required placeholder="Nome *" className={field} />
            <input name="company" placeholder="Empresa" className={field} />
            <input name="email" type="email" placeholder="E-mail" className={field} />
            <input name="phone" placeholder="Telefone" className={field} />
            <select name="status" defaultValue="prospect" className={field}>
              <option value="prospect">Prospect</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <button type="submit" className="btn-primary mt-4 w-full">
            Adicionar
          </button>
        </form>
      </div>
    </div>
  );
}
