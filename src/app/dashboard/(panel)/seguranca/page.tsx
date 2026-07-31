import { prisma } from '@/lib/prisma';
import { getVerifiedSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ShieldCheck, KeyRound, Smartphone, LogOut, CheckCircle2 } from 'lucide-react';
import { buildOtpAuthUri } from '@/lib/security/totp';
import {
  startMfaEnrollment,
  confirmMfa,
  disableMfa,
  revokeAllSessions,
  changePassword
} from './actions';

export const dynamic = 'force-dynamic';

const field =
  'w-full rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-accent';

const FEEDBACK: Record<string, { text: string; ok: boolean }> = {
  mfa_ativado: { text: '2FA ativado com sucesso.', ok: true },
  mfa_desativado: { text: '2FA desativado.', ok: true },
  codigo: { text: 'Código inválido. Tente novamente.', ok: false },
  senha: { text: 'Senha incorreta.', ok: false },
  senha_atual: { text: 'Senha atual incorreta.', ok: false },
  senha_curta: { text: 'A nova senha precisa ter no mínimo 12 caracteres.', ok: false },
  sem_segredo: { text: 'Inicie a ativação do 2FA novamente.', ok: false }
};

export default async function SegurancaPage({
  searchParams
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const session = await getVerifiedSession();
  if (!session) redirect('/dashboard/login');

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { email: true, totpEnabled: true, totpSecret: true }
  });
  if (!user) redirect('/dashboard/login');

  const params = await searchParams;
  const feedback = FEEDBACK[params.ok ?? params.erro ?? ''];
  const enrolling = !user.totpEnabled && !!user.totpSecret;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-accent" />
        <h1 className="font-display text-2xl font-bold">Segurança da conta</h1>
      </div>
      <p className="mt-1 text-sm text-muted">{session.email}</p>

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
          {user.totpEnabled && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
              <CheckCircle2 size={13} />
              Ativa
            </span>
          )}
        </div>

        {/* Not enrolled → offer to start */}
        {!user.totpEnabled && !enrolling && (
          <form action={startMfaEnrollment} className="mt-5">
            <button type="submit" className="btn-primary text-sm">
              Ativar 2FA
            </button>
          </form>
        )}

        {/* Enrolling → show the secret + confirm */}
        {enrolling && user.totpSecret && (
          <div className="mt-5 space-y-4">
            <ol className="space-y-3 text-sm text-muted">
              <li>
                <strong className="text-white">1.</strong> Abra o Google Authenticator,
                Authy, 1Password ou similar.
              </li>
              <li>
                <strong className="text-white">2.</strong> Adicione uma conta manualmente e
                cole esta chave:
                <code className="mt-2 block break-all rounded-lg border border-line bg-white/5 px-3 py-2 font-mono text-xs text-accent">
                  {user.totpSecret}
                </code>
                <span className="mt-2 block break-all text-[0.7rem] text-subtle">
                  {buildOtpAuthUri(user.totpSecret, user.email)}
                </span>
              </li>
              <li>
                <strong className="text-white">3.</strong> Digite o código de 6 dígitos
                para confirmar:
              </li>
            </ol>
            <form action={confirmMfa} className="flex gap-2">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                className={`${field} max-w-[160px] text-center font-mono tracking-[0.3em]`}
              />
              <button type="submit" className="btn-primary text-sm">
                Confirmar
              </button>
            </form>
          </div>
        )}

        {/* Enabled → allow disabling with password step-up */}
        {user.totpEnabled && (
          <form action={disableMfa} className="mt-5 flex flex-wrap items-center gap-2">
            <input
              name="password"
              type="password"
              placeholder="Confirme sua senha"
              required
              className={`${field} max-w-[240px]`}
            />
            <button type="submit" className="btn-ghost text-sm">
              Desativar 2FA
            </button>
          </form>
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
        <form action={changePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            name="current"
            type="password"
            placeholder="Senha atual"
            required
            autoComplete="current-password"
            className={field}
          />
          <input
            name="next"
            type="password"
            placeholder="Nova senha (min. 12)"
            required
            minLength={12}
            autoComplete="new-password"
            className={field}
          />
          <button type="submit" className="btn-primary text-sm sm:col-span-2">
            Alterar senha
          </button>
        </form>
      </section>

      {/* ---------------- Sessions ---------------- */}
      <section className="glass mt-4 rounded-2xl p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <LogOut size={16} className="text-accent" />
          Encerrar todas as sessões
        </h2>
        <p className="mt-1 text-sm text-muted">
          Desconecta esta conta de todos os dispositivos. Use se suspeitar de acesso
          indevido.
        </p>
        <form action={revokeAllSessions} className="mt-4">
          <button type="submit" className="btn-ghost text-sm">
            Encerrar sessões
          </button>
        </form>
      </section>
    </div>
  );
}
