'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Trash2, Loader2 } from 'lucide-react';
import { clsx } from '@/lib/clsx';

function Submit({ label, compact }: { label: string; compact: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg border border-line text-subtle transition-colors',
        'hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-7 w-7' : 'h-8 w-8'
      )}
    >
      {pending ? (
        <Loader2 size={compact ? 13 : 15} className="animate-spin" />
      ) : (
        <Trash2 size={compact ? 13 : 15} />
      )}
    </button>
  );
}

/**
 * Delete control that asks for confirmation before submitting.
 * The actual deletion runs in a server action — the confirmation is a UX guard,
 * never the authorization check.
 */
export function DeleteButton({
  action,
  id,
  name,
  label = 'Excluir',
  compact = false
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  /** Shown in the confirmation prompt so the user knows what they're removing. */
  name: string;
  label?: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirming) return;
        e.preventDefault();
        if (window.confirm(`Excluir "${name}"?\n\nEssa ação não pode ser desfeita.`)) {
          setConfirming(true);
          e.currentTarget.requestSubmit();
        }
      }}
      className="inline-flex"
    >
      <input type="hidden" name="id" value={id} />
      <Submit label={label} compact={compact} />
    </form>
  );
}
