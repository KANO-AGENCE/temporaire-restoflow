'use client';

import Link from 'next/link';
import {
  Building2,
  Calendar,
  ClipboardCheck,
  Flame,
  Send,
  Sparkles,
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, PlatformBadge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { addDays, formatDateFr, startOfWeek } from '@/lib/utils';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1558030006-450675393462?w=1600&q=80';

export default function DashboardPage() {
  const { establishments, posts, media, activeEstablishmentId } = useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const scopedPosts = active ? posts.filter((p) => p.establishmentId === active.id) : posts;

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const thisWeek = scopedPosts.filter((p) => {
    const d = new Date(p.date);
    return d >= weekStart && d < weekEnd;
  });
  const toValidate = scopedPosts.filter((p) => p.status === 'a-valider');
  const published = scopedPosts.filter((p) => p.status === 'publie');
  const upcoming = [...scopedPosts]
    .filter((p) => new Date(p.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const cover =
    active && media.find((m) => m.establishmentId === active.id)?.url || HERO_IMAGE;

  const stats = [
    { label: 'Cette semaine', value: thisWeek.length, icon: Calendar, href: '/calendar' },
    { label: 'À valider', value: toValidate.length, icon: ClipboardCheck, href: '/validation' },
    { label: 'Publiés', value: published.length, icon: Send, href: '/publications' },
    { label: 'Établissements', value: establishments.length, icon: Building2, href: '/establishments' },
  ];

  const summary = active
    ? `Stratégie pour ${active.name}: ton ${active.tone ?? 'à définir'}, positionnement ${active.positioning ?? 'à définir'}. ${thisWeek.length} contenus prévus cette semaine, ${toValidate.length} à valider. Lancez le pipeline depuis Stratégie & Génération.`
    : 'Créez un premier établissement, puis lancez le pipeline depuis Stratégie & Génération.';

  return (
    <div>
      {/* HERO brandé */}
      <div className="relative mb-6 overflow-hidden rounded-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cover})` }}
        />
        <div className="absolute inset-0 bg-plate-gradient" />
        <div className="relative flex flex-col gap-4 p-6 text-white sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div>
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-brand-200">
              <Flame size={12} /> Tableau de bord
            </p>
            {active ? (
              <>
                <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
                  {active.name}
                  <span className="ml-2 align-middle text-sm font-sans font-normal text-ink-100/80">
                    · {active.city}
                  </span>
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-ink-100/85">
                  {active.cuisineType ?? 'Restaurant'}
                  {active.address ? ` — ${active.address}` : ''}
                </p>
              </>
            ) : (
              <h1 className="mt-2 font-display text-3xl">Bienvenue</h1>
            )}
          </div>
          <Link href="/strategy">
            <Button className="bg-white text-ink-900 hover:bg-ink-100">
              <Sparkles size={16} /> Lancer le pipeline
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition hover:shadow-md">
              <CardBody className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <s.icon size={18} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-ink-500">{s.label}</div>
                  <div className="text-2xl font-semibold">{s.value}</div>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Prochaines publications</CardTitle>
            <Link href="/calendar" className="text-xs font-medium text-brand-700 hover:underline">
              Voir le calendrier →
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-ink-500">Aucune publication à venir pour le moment.</p>
            ) : (
              upcoming.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-ink-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span className="font-medium text-ink-700">{formatDateFr(p.date)}</span>
                      <span>· {p.time}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 truncate text-sm text-ink-800">
                      {p.versions[0]?.text}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.platforms.map((pl) => (
                      <PlatformBadge key={pl} platform={pl} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-600" />
                Résumé IA
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm leading-relaxed text-ink-700">{summary}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
