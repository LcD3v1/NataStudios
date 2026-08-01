import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { clsx } from '@/lib/clsx';

/**
 * Delete control that asks for confirmation before firing.
 * The confirmation is a UX guard — authorization always happens on the server.
 */
export function DeleteButton({
  onDelete,
  name,
  label = 'Excluir',
  compact = false
}: {
  onDelete: () => Promise<void>;
  /** Shown in the prompt so the user knows what they're removing. */
  name: string;
  label?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (!window.confirm(`Excluir "${name}"?\n\nEssa ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg border border-line text-subtle transition-colors',
        'hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-7 w-7' : 'h-8 w-8'
      )}
    >
      {busy ? (
        <Loader2 size={compact ? 13 : 15} className="animate-spin" />
      ) : (
        <Trash2 size={compact ? 13 : 15} />
      )}
    </button>
  );
}
