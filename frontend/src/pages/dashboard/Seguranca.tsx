import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, Smartphone, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Me } from '@/components/dashboard/DashboardLayout';

type Feedback = { text: string; ok: boolean } | null;

const ERRORS: Record<string, string> = {
  codigo_invalido: 'Código inválido. Tente novamente.',
  senha_invalida: 'Senha incorreta.',
  senha_atual_invalida: 'Senha atual incorreta.',
  senha_curta: 'A nova senha precisa ter no mínimo 12 caracteres.',
  sem_segredo: 'Inicie a ativação do 2FA novamente.'
};

export default function Seguranca() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [disablePwd, setDisablePwd] = useState('');
  const [pwd, setPwd] = useState({ current: '', next: '' });

  const load = useCallback(
    () => api.get<{ user: Me }>('/auth/me').then((r) => setMe(r.user)),
    []
  );

  useEffect(() => {
    load().catch(() => navigate('/dashboard/login', { replace: true }));
  }, [load, navigate]);

  async function act(fn: () => Promise<void>, successMsg?: string) {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      if (successMsg) setFeedback({ text: successMsg, ok: true });
      await load();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'erro';
      setFeedback({ text: ERRORS[code] ?? 'Não foi possível concluir. Tente novamente.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <Loader2 className="animate-spin text-accent" size={24} />;

  const enrolling = !me.totpEnabled && !!me.enrollingSecret;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Segurança da conta</h1>
      </div>
      <p className="mt-1 text-sm text-muted">{me.email}</p>

      {feedback && (
        <p
          role="status"
          className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            feedback.ok
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}
        >
          {feedback.text}
        </p>
      )}

      {/* ---------------- MFA ---------------- */}
      <section className="glass mt-8 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Smartphone size={16} className="text-accent" />
              Verificação em duas etapas (2FA)
            </h2>
            <p className="mt-1 text-sm text-muted">
              Exige um código do seu aplicativo autenticador além da senha.
            </p>
          </div>
          {me.totpEnabled && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
              <CheckCircle2 size={13} />
              Ativa
            </span>
          )}
        </div>

        {!me.totpEnabled && !enrolling && (
          <button
            type="button"
            disabled={busy}
            onClick={() => act(() => api.post('/auth/mfa/start').then(() => {}))}
            className="btn-primary mt-5 text-sm"
          >
            Ativar 2FA
          </button>
        )}

        {enrolling && (
          <div className="mt-5 space-y-4">
            <ol className="space-y-3 text-sm text-muted">
              <li>
                <strong className="text-white">1.</strong> Abra o Google Authenticator, Authy,
                1Password ou similar.
              </li>
              <li>
                <strong className="text-white">2.</strong> Adicione uma conta manualmente e cole
                esta chave:
                <code className="mt-2 block break-all rounded-lg border border-line bg-white/5 px-3 py-2 font-mono text-xs text-accent">
                  {me.enrollingSecret}
                </code>
              </li>
              <li>
                <strong className="text-white">3.</strong> Digite o código de 6 dígitos para
                confirmar:
              </li>
            </ol>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="field max-w-[160px] text-center font-mono tracking-[0.3em]"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await api.post('/auth/mfa/confirm', { code });
                    setCode('');
                  }, '2FA ativado com sucesso.')
                }
                className="btn-primary text-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}

        {me.totpEnabled && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="Confirme sua senha"
              value={disablePwd}
              onChange={(e) => setDisablePwd(e.target.value)}
              className="field max-w-[240px]"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  await api.post('/auth/mfa/disable', { password: disablePwd });
                  setDisablePwd('');
                }, '2FA desativado.')
              }
              className="btn-ghost text-sm"
            >
              Desativar 2FA
            </button>
          </div>
        )}
      </section>

      {/* ---------------- Password ---------------- */}
      <section className="glass mt-4 rounded-2xl p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <KeyRound size={16} className="text-accent" />
          Alterar senha
        </h2>
        <p className="mt-1 text-sm text-muted">
          Mínimo de 12 caracteres. Ao alterar, todas as sessões são encerradas.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="password"
            placeholder="Senha atual"
            autoComplete="current-password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            className="field"
          />
          <input
            type="password"
            placeholder="Nova senha (min. 12)"
            autoComplete="new-password"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            className="field"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              act(async () => {
                await api.post('/auth/password', pwd);
                navigate('/dashboard/login', { replace: true });
              })
            }
            className="btn-primary text-sm sm:col-span-2"
          >
            Alterar senha
          </button>
        </div>
      </section>

      {/* ---------------- Sessions ---------------- */}
      <section className="glass mt-4 rounded-2xl p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <LogOut size={16} className="text-accent" />
          Encerrar todas as sessões
        </h2>
        <p className="mt-1 text-sm text-muted">
          Desconecta esta conta de todos os dispositivos. Use se suspeitar de acesso indevido.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            act(async () => {
              await api.post('/auth/sessions/revoke');
              navigate('/dashboard/login', { replace: true });
            })
          }
          className="btn-ghost mt-4 text-sm"
        >
          Encerrar sessões
        </button>
      </section>
    </div>
  );
}
