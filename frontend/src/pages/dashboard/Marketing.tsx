import { useEffect, useState } from 'react';
import {
  Megaphone,
  Plus,
  Instagram,
  Facebook,
  Linkedin,
  Music2,
  Loader2,
  type LucideIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import { DeleteButton } from '@/components/dashboard/DeleteButton';

type Post = {
  id: string;
  title: string;
  platform: string;
  status: string;
  scheduledFor: string | null;
  client: { name: string } | null;
};
type Client = { id: string; name: string };

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

const fmt = (d: string | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(d)) : null;

const EMPTY = { title: '', platform: 'instagram', clientId: '', status: 'idea', scheduledFor: '' };

export default function Marketing() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);

  const load = () => api.get<{ posts: Post[] }>('/dashboard/posts').then((r) => setPosts(r.posts));

  useEffect(() => {
    load().catch(() => setPosts([]));
    api
      .get<{ clients: Client[] }>('/dashboard/clients')
      .then((r) => setClients(r.clients))
      .catch(() => {});
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await api.post('/dashboard/posts', form);
    setForm(EMPTY);
    await load();
  }

  async function remove(id: string) {
    await api.del(`/dashboard/posts/${id}`);
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Megaphone size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Marketing</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Calendário de conteúdo das redes sociais.</p>

      <div className="glass mt-6 rounded-2xl p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Plus size={16} className="text-accent" />
          Novo post
        </button>
        {open && (
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              required
              placeholder="Título / ideia *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field lg:col-span-2"
            />
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="field"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="tiktok">TikTok</option>
            </select>
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
              <option value="idea">Ideia</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
            </select>
            <input
              type="date"
              value={form.scheduledFor}
              onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
              className="field lg:col-span-2"
            />
            <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-3">
              Adicionar post
            </button>
          </form>
        )}
      </div>

      {posts === null ? (
        <Loader2 className="mt-8 animate-spin text-accent" size={24} />
      ) : (
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
                      <div
                        key={post.id}
                        className="group rounded-xl border border-line bg-surface-2 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Icon size={15} className="mt-0.5 shrink-0 text-accent" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">{post.title}</p>
                            {post.client && (
                              <p className="mt-0.5 truncate text-xs text-subtle">
                                {post.client.name}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                            <DeleteButton
                              onDelete={() => remove(post.id)}
                              name={post.title}
                              label="Excluir post"
                              compact
                            />
                          </div>
                        </div>
                        {post.scheduledFor && (
                          <p className="mt-2 text-[0.65rem] text-muted">{fmt(post.scheduledFor)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
