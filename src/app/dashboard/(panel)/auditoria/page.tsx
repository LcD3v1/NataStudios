import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ACTION: Record<string, { label: string; cls: string }> = {
  login_success: { label: 'Login', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  login_failed: { label: 'Login falhou', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  login_rate_limited: { label: 'Bloqueio (brute-force)', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  logout: { label: 'Logout', cls: 'border-line bg-white/5 text-muted' },
  create_client: { label: 'Cliente criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  create_project: { label: 'Projeto criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  move_project: { label: 'Projeto movido', cls: 'border-line bg-white/5 text-muted' },
  create_post: { label: 'Post criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  create_invoice: { label: 'Fatura criada', cls: 'border-accent/40 bg-accent-soft text-accent' },
  contact_submitted: { label: 'Contato recebido', cls: 'border-line bg-white/5 text-muted' },
  newsletter_signup: { label: 'Newsletter', cls: 'border-line bg-white/5 text-muted' }
};

function fmt(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export default async function AuditoriaPage() {
  const session = await getSession();

  // Least privilege: only admins can read the security log.
  if (session?.role !== 'admin') {
    return (
      <div className="glass mt-4 flex flex-col items-center rounded-2xl p-16 text-center">
        <ShieldAlert size={28} className="text-red-400" />
        <p className="mt-4 font-display text-lg font-semibold">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted">Somente administradores podem ver a auditoria.</p>
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Auditoria</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Registro de logins e ações administrativas (últimos 200 eventos).
      </p>

      <div className="mt-8 glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-5 py-3 font-medium">Evento</th>
                <th className="px-5 py-3 font-medium">Ator</th>
                <th className="px-5 py-3 font-medium">IP</th>
                <th className="px-5 py-3 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    Nenhum evento registrado ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const a = ACTION[log.action] ?? { label: log.action, cls: 'border-line bg-white/5 text-muted' };
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-xs ${a.cls}`}>
                          {a.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted">{log.actor ?? '—'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-subtle">{log.ip ?? '—'}</td>
                      <td className="px-5 py-3 text-subtle">{fmt(log.createdAt)}</td>
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
