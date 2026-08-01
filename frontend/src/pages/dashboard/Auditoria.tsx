import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type Log = {
  id: string;
  action: string;
  actor: string | null;
  ip: string | null;
  createdAt: string;
};

const ACTION: Record<string, { label: string; cls: string }> = {
  login_success: { label: 'Login', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  login_failed: { label: 'Login falhou', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  login_rate_limited: { label: 'Bloqueio (brute-force)', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  login_locked_out: { label: 'Conta bloqueada', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  login_mfa_failed: { label: '2FA incorreto', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  mfa_enabled: { label: '2FA ativado', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' },
  mfa_disabled: { label: '2FA desativado', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  sessions_revoked: { label: 'Sessões encerradas', cls: 'border-accent/40 bg-accent-soft text-accent' },
  password_changed: { label: 'Senha alterada', cls: 'border-accent/40 bg-accent-soft text-accent' },
  logout: { label: 'Logout', cls: 'border-line bg-white/5 text-muted' },
  create_client: { label: 'Cliente criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  create_project: { label: 'Projeto criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  move_project: { label: 'Projeto movido', cls: 'border-line bg-white/5 text-muted' },
  create_post: { label: 'Post criado', cls: 'border-accent/40 bg-accent-soft text-accent' },
  create_invoice: { label: 'Fatura criada', cls: 'border-accent/40 bg-accent-soft text-accent' },
  delete_client: { label: 'Cliente excluído', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  delete_project: { label: 'Projeto excluído', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  delete_post: { label: 'Post excluído', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  delete_invoice: { label: 'Fatura excluída', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  delete_lead: { label: 'Lead excluído', cls: 'border-red-500/30 bg-red-500/10 text-red-400' },
  contact_submitted: { label: 'Contato recebido', cls: 'border-line bg-white/5 text-muted' }
};

const fmt = (d: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(d));

export default function Auditoria() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    api
      .get<{ logs: Log[] }>('/dashboard/audit')
      .then((r) => setLogs(r.logs))
      .catch((err) => {
        // Least privilege: the API restricts this to admins.
        if (err instanceof ApiError && err.status === 403) setDenied(true);
        setLogs([]);
      });
  }, []);

  if (denied) {
    return (
      <div className="glass mt-4 flex flex-col items-center rounded-2xl p-16 text-center">
        <ShieldAlert size={28} className="text-red-400" />
        <p className="mt-4 font-display text-lg font-semibold">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted">Somente administradores podem ver a auditoria.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Auditoria</h1>
      </div>
      <p className="mt-1 text-sm text-muted">
        Registro de logins e ações administrativas (últimos 200 eventos).
      </p>

      <div className="glass mt-8 overflow-hidden rounded-2xl">
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
              {logs === null ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <Loader2 className="mx-auto animate-spin text-accent" size={20} />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-muted">
                    Nenhum evento registrado ainda.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const a = ACTION[log.action] ?? {
                    label: log.action,
                    cls: 'border-line bg-white/5 text-muted'
                  };
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
