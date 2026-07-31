'use client';

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
import { CalendarClock, GripVertical } from 'lucide-react';
import { moveProject, deleteProject } from '@/app/dashboard/(panel)/projetos/actions';
import { DeleteButton } from '@/components/dashboard/DeleteButton';
import { clsx } from '@/lib/clsx';

export type KanbanProject = {
  id: string;
  name: string;
  clientName: string | null;
  deadline: string | null;
};

const COLUMNS = [
  { key: 'backlog', label: 'Backlog', accent: 'text-subtle' },
  { key: 'in_progress', label: 'Em andamento', accent: 'text-accent' },
  { key: 'review', label: 'Revisão', accent: 'text-accent-2' },
  { key: 'done', label: 'Concluído', accent: 'text-emerald-400' }
] as const;

type Board = Record<string, KanbanProject[]>;

function Card({ project, overlay = false }: { project: KanbanProject; overlay?: boolean }) {
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
          {project.clientName && (
            <p className="mt-0.5 truncate text-xs text-subtle">{project.clientName}</p>
          )}
          {project.deadline && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[0.65rem] text-muted">
              <CalendarClock size={11} />
              {project.deadline}
            </p>
          )}
        </div>
        {!overlay && (
          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <DeleteButton
              action={deleteProject}
              id={project.id}
              name={project.name}
              label="Excluir projeto"
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Column({ col, projects }: { col: (typeof COLUMNS)[number]; projects: KanbanProject[] }) {
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
          <Card key={p.id} project={p} />
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

export function KanbanBoard({ initial }: { initial: Board }) {
  const [board, setBoard] = useState<Board>(initial);
  const [active, setActive] = useState<KanbanProject | null>(null);

  // Re-sync when the server sends fresh data (e.g. after creating or deleting a
  // project). Drag-and-drop only revalidates /dashboard, so this never fires
  // mid-drag and won't fight the optimistic move below.
  const fingerprint = JSON.stringify(
    Object.entries(initial).map(([col, items]) => [col, items.map((i) => i.id)])
  );
  useEffect(() => {
    setBoard(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function findProject(id: string): { col: string; project: KanbanProject } | null {
    for (const col of Object.keys(board)) {
      const project = board[col].find((p) => p.id === id);
      if (project) return { col, project };
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    const found = findProject(String(e.active.id));
    setActive(found?.project ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const id = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    const found = findProject(id);
    if (!target || !found || found.col === target) return;

    setBoard((prev) => {
      const next: Board = {};
      for (const key of Object.keys(prev)) next[key] = prev[key].filter((p) => p.id !== id);
      next[target] = [found.project, ...next[target]];
      return next;
    });

    void moveProject(id, target);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <Column key={col.key} col={col} projects={board[col.key] ?? []} />
        ))}
      </div>
      <DragOverlay>{active ? <Card project={active} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
