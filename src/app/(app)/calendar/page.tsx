'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { addDays, formatDateShort, sameDay, startOfMonth, startOfWeek } from '@/lib/utils';
import type { Post } from '@/types';

type View = 'week' | 'month';

export default function CalendarPage() {
  const { establishments, activeEstablishmentId, posts, updatePost, removePost } =
    useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const scoped = active ? posts.filter((p) => p.establishmentId === active.id) : [];

  const [view, setView] = useState<View>('week');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState<Post | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfMonth(cursor);
    const firstWeekStart = startOfWeek(start);
    return Array.from({ length: 42 }, (_, i) => addDays(firstWeekStart, i));
  }, [view, cursor]);

  function shift(delta: number) {
    const d = new Date(cursor);
    if (view === 'week') d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    setCursor(d);
  }

  function onDragStart(id: string) {
    setDraggingId(id);
  }

  function onDrop(date: Date) {
    if (!draggingId) return;
    updatePost(draggingId, { date: date.toISOString().slice(0, 10) });
    setDraggingId(null);
  }

  if (!active) {
    return (
      <div>
        <PageHeader title="Calendrier éditorial" />
        <EmptyState icon={<CalendarDays size={28} />} title="Sélectionnez un établissement" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Calendrier éditorial"
        description="Visualisation du plan généré depuis Stratégie & Génération. Déplacez les contenus par drag & drop."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-ink-200 p-0.5 text-sm">
              <button
                onClick={() => setView('week')}
                className={`rounded px-3 py-1 ${view === 'week' ? 'bg-ink-900 text-white' : 'text-ink-600'}`}
              >
                Semaine
              </button>
              <button
                onClick={() => setView('month')}
                className={`rounded px-3 py-1 ${view === 'month' ? 'bg-ink-900 text-white' : 'text-ink-600'}`}
              >
                Mois
              </button>
            </div>
            <Link href="/strategy">
              <Button variant="outline">
                <Sparkles size={16} /> Stratégie & Génération
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardBody>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shift(-1)}
                className="rounded-lg border border-ink-200 p-1.5 hover:bg-ink-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => shift(1)}
                className="rounded-lg border border-ink-200 p-1.5 hover:bg-ink-50"
              >
                <ChevronRight size={16} />
              </button>
              <div className="ml-2 text-sm font-medium">
                {cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-ink-200 bg-ink-200 text-xs">
            {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => (
              <div
                key={d}
                className="bg-ink-50 px-2 py-1.5 text-center font-medium uppercase text-ink-500"
              >
                {d}
              </div>
            ))}
            {days.map((day, i) => {
              const inMonth = view === 'week' || day.getMonth() === cursor.getMonth();
              const dayPosts = scoped.filter((p) => sameDay(p.date, day));
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={i}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(day)}
                  className={`min-h-[110px] bg-white p-1.5 ${inMonth ? '' : 'opacity-40'}`}
                >
                  <div
                    className={`mb-1 flex items-center justify-between text-[11px] ${isToday ? 'font-semibold text-brand-700' : 'text-ink-500'}`}
                  >
                    <span>{formatDateShort(day)}</span>
                  </div>
                  <div className="space-y-1">
                    {dayPosts.map((p) => (
                      <button
                        key={p.id}
                        draggable
                        onDragStart={() => onDragStart(p.id)}
                        onClick={() => setSelected(p)}
                        className="block w-full cursor-grab rounded-md border border-ink-100 bg-white px-1.5 py-1 text-left text-[11px] hover:border-brand-300 hover:bg-brand-50/40 active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-medium">{p.time ?? ''} {p.objective}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {p.platforms.slice(0, 2).map((pl) => (
                            <PlatformBadge key={pl} platform={pl} />
                          ))}
                        </div>
                        <div className="mt-0.5">
                          <StatusBadge status={p.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.objective} · ${formatDateShort(selected.date)}` : ''}
        size="lg"
      >
        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {selected.platforms.map((pl) => (
                <PlatformBadge key={pl} platform={pl} />
              ))}
              <StatusBadge status={selected.status} />
            </div>
            {selected.versions.map((v) => (
              <div key={v.platform} className="rounded-lg border border-ink-100 p-3 text-sm">
                <div className="mb-1.5 flex items-center gap-2">
                  <PlatformBadge platform={v.platform} />
                </div>
                <p className="whitespace-pre-line text-ink-800">{v.text}</p>
                {v.hashtags.length > 0 ? (
                  <p className="mt-2 text-xs text-brand-600">{v.hashtags.join(' ')}</p>
                ) : null}
              </div>
            ))}
            <Textarea
              label="Idée visuelle"
              defaultValue={selected.visualIdea ?? ''}
              onChange={(e) => updatePost(selected.id, { visualIdea: e.target.value })}
            />
            <div className="flex justify-between gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Supprimer ce post ?')) {
                    removePost(selected.id);
                    setSelected(null);
                  }
                }}
              >
                Supprimer
              </Button>
              <Button onClick={() => setSelected(null)}>Fermer</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
