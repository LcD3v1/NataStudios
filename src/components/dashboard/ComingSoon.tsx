import { Construction } from 'lucide-react';

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <div className="glass mt-8 flex flex-col items-center justify-center rounded-2xl p-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white/5">
          <Construction size={26} className="text-accent" />
        </span>
        <p className="mt-5 font-display text-lg font-semibold">Módulo em construção</p>
        <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
