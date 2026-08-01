import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { KanbanSquare, Plus, CalendarClock, GripVertical, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { DeleteButton } from '@/components/dashboard/DeleteButton';
import { clsx } from '@/lib/clsx';

type Project = {
  id: string;
  name: string;
  status: string;
  deadline: string | null;
  client: { name: string } | null;
};
type Client = { id: string; name: string };

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', accent: 'text-subtle' },
  { key: 'in_progress', label: 'Em andamento', accent: 'text-accent' },
  { key: 'review', label: 'Revisão', accent: 'text-accent-2' },
  { key: 'done', label: 'Concluído', accent: 'text-emerald-400' }
] as const;

const fmt = (d: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : null;

function Card({
  project,
  overlay = false,
  onDelete
}: {
  project: Project;
  overlay?: boolean;
  onDelete?: () => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: project.id });

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={clsx(
        'group relative rounded-xl border border-line bg-surface-2 p-3 text-left',
        isDragging && !overlay && 'opacity-40',
        overlay && 'shadow-glow'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Only the handle starts a drag, so the delete button stays clickable. */}
        <span
          {...(overlay ? {} : listeners)}
          {...(overlay ? {} : attributes)}
          className="mt-0.5 shrink-0 cursor-grab text-subtle active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{project.name}</p>
          {project.client && (
            <p className="mt-0.5 truncate text-xs text-subtle">{project.client.name}</p>
          )}
          {project.deadline && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[0.65rem] text-muted">
              <CalendarClock size={11} />
              {fmt(project.deadline)}
            </p>
          )}
        </div>
        {!overlay && onDelete && (
          <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <DeleteButton onDelete={onDelete} name={project.name} label="Excluir projeto" compact />
          </div>
        )}
      </div>
    </div>
  );
}

function Column({
  col,
  projects,
  onDelete
}: {
  col: (typeof COLUMNS)[number];
  projects: Project[];
  onDelete: (id: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex min-h-[300px] flex-col rounded-2xl border border-line bg-ink-2/50 p-3 transition-colors',
        isOver && 'border-accent/50 bg-accent-soft'
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={clsx('text-sm font-semibold', col.accent)}>{col.label}</span>
        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-subtle">
          {projects.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {projects.map((p) => (
          <Card key={p.id} project={p} onDelete={() => onDelete(p.id)} />
        ))}
        {projects.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line text-xs text-subtle">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY = { name: '', clientId: '', status: 'backlog', deadline: '' };

export default function Projetos() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [active, setActive] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = () =>
    api.get<{ projects: Project[] }>('/dashboard/projects').then((r) => setProjects(r.projects));

  useEffect(() => {
    load().catch(() => setProjects([]));
    api
      .get<{ clients: Client[] }>('/dashboard/clients')
      .then((r) => setClients(r.clients))
      .catch(() => {});
  }, []);

  function onDragStart(e: DragStartEvent) {
    setActive(projects?.find((p) => p.id === e.active.id) ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const id = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    const project = projects?.find((p) => p.id === id);
    if (!target || !project || project.status === target) return;

    // Optimistic move, then persist.
    setProjects((prev) =>
      prev ? prev.map((p) => (p.id === id ? { ...p, status: target } : p)) : prev
    );
    await api.patch(`/dashboard/projects/${id}/status`, { status: target }).catch(() => load());
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await api.post('/dashboard/projects', form);
    setForm(EMPTY);
    await load();
  }

  async function remove(id: string) {
    await api.del(`/dashboard/projects/${id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <KanbanSquare size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Projetos</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Arraste os cards entre as colunas para atualizar o status.
      </p>

      <div className="glass mt-6 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} className="text-accent" />
          Novo projeto
        </button>
        {open && (
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              required
              placeholder="Nome do projeto *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="field lg:col-span-2"
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
              <option value="backlog">Backlog</option>
              <option value="in_progress">Em andamento</option>
              <option value="review">Revisão</option>
              <option value="done">Concluído</option>
            </select>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="field"
            />
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-5">
              Adicionar projeto
            </button>
          </form>
        )}
      </div>

      {projects === null ? (
        <Loader2 className="mt-8 animate-spin text-accent" size={24} />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <Column
                key={col.key}
                col={col}
                projects={projects.filter((p) => p.status === col.key)}
                onDelete={remove}
              />
            ))}
          </div>
          <DragOverlay>{active ? <Card project={active} overlay /> : null}</DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
