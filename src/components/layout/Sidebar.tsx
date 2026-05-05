'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Sparkles,
  CalendarDays,
  Images,
  ShieldCheck,
  Send,
  Settings,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/establishments', label: 'Établissements', icon: Building2 },
  { href: '/strategy', label: 'Stratégie & Génération', icon: Sparkles },
  { href: '/calendar', label: 'Calendrier éditorial', icon: CalendarDays },
  { href: '/media', label: 'Médiathèque', icon: Images },
  { href: '/validation', label: 'Validation', icon: ShieldCheck },
  { href: '/publications', label: 'Publications', icon: Send },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const active = useAppStore((s) =>
    s.establishments.find((e) => e.id === s.activeEstablishmentId)
  );
  return (
    <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-ink-100 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-ember-gradient text-white">
          <Flame size={18} />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">RestoFlow</div>
          <div className="text-[11px] text-ink-500">Communication restaurant</div>
        </div>
      </div>

      {active ? (
        <div className="mx-3 mt-3 rounded-xl bg-gradient-to-br from-ink-900 to-ink-800 px-3 py-2.5 text-white">
          <div className="text-[10px] uppercase tracking-[0.18em] text-brand-200">
            Établissement actif
          </div>
          <div className="font-display text-sm leading-tight">{active.name}</div>
          <div className="text-[11px] text-ink-100/70">{active.city}</div>
        </div>
      ) : null}

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const a = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                a
                  ? 'bg-brand-50 text-brand-800'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-ink-100 p-3 text-[11px] text-ink-400">
        v0.3 — Lifting brasserie
      </div>
    </aside>
  );
}
