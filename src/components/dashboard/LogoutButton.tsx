'use client';

import { LogOut } from 'lucide-react';

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button
        type="submit"
        className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-white"
      >
        <LogOut size={15} />
        Sair
      </button>
    </form>
  );
}
