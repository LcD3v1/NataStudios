import { prisma } from '@/lib/prisma';
import { KanbanSquare, Plus } from 'lucide-react';
import { KanbanBoard, type KanbanProject } from '@/components/dashboard/KanbanBoard';
import { createProject } from './actions';

export const dynamic = 'force-dynamic';

function fmt(d: Date | null) {
  return d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d) : null;
}

export default async function ProjetosPage() {
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: 'desc' }, include: { client: true } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } })
  ]);

  const board: Record<string, KanbanProject[]> = {
    backlog: [],
    in_progress: [],
    review: [],
    done: []
  };
  for (const p of projects) {
    const item: KanbanProject = {
      id: p.id,
      name: p.name,
      clientName: p.client?.name ?? null,
      deadline: fmt(p.deadline)
    };
    (board[p.status] ?? board.backlog).push(item);
  }

  const field =
    'rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent';

  return (
    <div>
      <div className="flex items-center gap-2">
        <KanbanSquare size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Projetos</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Arraste os cards entre as colunas para atualizar o status.
      </p>

      {/* Create */}
      <details className="glass mt-6 rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <Plus size={16} className="text-accent" />
          Novo projeto
        </summary>
        <form
          action={createProject}
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input name="name" required placeholder="Nome do projeto *" className={`${field} lg:col-span-2`} />
          <select name="clientId" defaultValue="" className={field}>
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue="backlog" className={field}>
            <option value="backlog">Backlog</option>
            <option value="in_progress">Em andamento</option>
            <option value="review">Revisão</option>
            <option value="done">Concluído</option>
          </select>
          <input name="deadline" type="date" className={field} />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-5">
            Adicionar projeto
          </button>
        </form>
      </details>

      <div className="mt-6">
        <KanbanBoard initial={board} />
      </div>
    </div>
  );
}
