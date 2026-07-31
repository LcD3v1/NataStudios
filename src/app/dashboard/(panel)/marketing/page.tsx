import { prisma } from '@/lib/prisma';
import { Megaphone, Plus, Instagram, Facebook, Linkedin, Music2, type LucideIcon } from 'lucide-react';
import { createPost } from './actions';

export const dynamic = 'force-dynamic';

const PLATFORM_ICON: Record<string, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2
};

const COLUMNS = [
  { key: 'idea', label: 'Ideias', accent: 'text-subtle' },
  { key: 'scheduled', label: 'Agendados', accent: 'text-accent' },
  { key: 'published', label: 'Publicados', accent: 'text-emerald-400' }
];

function fmt(d: Date | null) {
  return d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d) : null;
}

export default async function MarketingPage() {
  const [posts, clients] = await Promise.all([
    prisma.socialPost.findMany({ orderBy: { scheduledFor: 'asc' }, include: { client: true } }),
    prisma.client.findMany({ orderBy: { name: 'asc' } })
  ]);

  const field =
    'rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent';

  return (
    <div>
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Marketing</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Calendário de conteúdo das redes sociais.</p>

      {/* Create */}
      <details className="glass mt-6 rounded-2xl p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <Plus size={16} className="text-accent" />
          Novo post
        </summary>
        <form action={createPost} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input name="title" required placeholder="Título / ideia *" className={`${field} lg:col-span-2`} />
          <select name="platform" defaultValue="instagram" className={field}>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="tiktok">TikTok</option>
          </select>
          <select name="clientId" defaultValue="" className={field}>
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="status" defaultValue="idea" className={field}>
            <option value="idea">Ideia</option>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
          </select>
          <input name="scheduledFor" type="date" className={`${field} lg:col-span-2`} />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3">
            Adicionar post
          </button>
        </form>
      </details>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = posts.filter((p) => p.status === col.key);
          return (
            <div key={col.key} className="rounded-2xl border border-line bg-ink-2/50 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className={`text-sm font-semibold ${col.accent}`}>{col.label}</span>
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-subtle">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-subtle">Nada por aqui.</p>
                )}
                {items.map((post) => {
                  const Icon = PLATFORM_ICON[post.platform] ?? Instagram;
                  return (
                    <div key={post.id} className="rounded-xl border border-line bg-surface-2 p-3">
                      <div className="flex items-start gap-2">
                        <Icon size={15} className="mt-0.5 shrink-0 text-accent" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">{post.title}</p>
                          {post.client && (
                            <p className="mt-0.5 truncate text-xs text-subtle">{post.client.name}</p>
                          )}
                        </div>
                      </div>
                      {post.scheduledFor && (
                        <p className="mt-2 text-[0.65rem] text-muted">
                          {fmt(post.scheduledFor)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
