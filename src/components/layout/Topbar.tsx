'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function Topbar() {
  const router = useRouter();
  const { user, establishments, activeEstablishmentId, setActiveEstablishment, logout } =
    useAppStore();

  const active = establishments.find((e) => e.id === activeEstablishmentId);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-200 bg-white/80 px-5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={activeEstablishmentId ?? ''}
            onChange={(e) => setActiveEstablishment(e.target.value || null)}
            className="h-9 appearance-none rounded-lg border border-ink-200 bg-white pl-3 pr-9 text-sm font-medium text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {establishments.length === 0 ? <option value="">Aucun établissement</option> : null}
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.city}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
        </div>
        {active ? (
          <span className="hidden text-xs text-ink-500 sm:inline">
            {active.positioning} · {active.tone}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-ink-800">{user?.name || user?.email}</div>
          <div className="text-[11px] text-ink-500">Compte démo local</div>
        </div>
        <button
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50"
          title="Se déconnecter"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
