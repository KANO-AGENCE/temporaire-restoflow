'use client';

import { CalendarClock, CheckCircle2, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { formatDateFr, nowIso, uid } from '@/lib/utils';
import type { Platform } from '@/types';

export default function PublicationsPage() {
  const {
    posts,
    establishments,
    activeEstablishmentId,
    platformAccounts,
    publications,
    updatePost,
    addPublicationLog,
    upsertPlatformAccount,
  } = useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);

  if (!active) {
    return (
      <div>
        <PageHeader title="Publications" />
        <EmptyState icon={<Send size={28} />} title="Sélectionnez un établissement" />
      </div>
    );
  }

  const activeId = active.id;
  const ready = posts.filter((p) => p.establishmentId === activeId && p.status === 'valide');
  const scheduled = posts.filter((p) => p.establishmentId === activeId && p.status === 'programme');
  const published = posts.filter((p) => p.establishmentId === activeId && p.status === 'publie');
  const accounts = platformAccounts.filter((a) => a.establishmentId === activeId);

  function schedule(postId: string) {
    const p = posts.find((x) => x.id === postId);
    if (!p) return;
    updatePost(postId, { status: 'programme', scheduledFor: `${p.date}T${p.time ?? '12:00'}:00` });
    p.platforms.forEach((pl) => {
      addPublicationLog({
        id: uid('plog'),
        postId,
        platform: pl,
        status: 'scheduled',
        message: `Programmé pour ${formatDateFr(p.date)}`,
        at: nowIso(),
      });
    });
  }

  function markPublished(postId: string) {
    const p = posts.find((x) => x.id === postId);
    if (!p) return;
    updatePost(postId, { status: 'publie', publishedAt: nowIso() });
    p.platforms.forEach((pl) => {
      addPublicationLog({
        id: uid('plog'),
        postId,
        platform: pl,
        status: 'published',
        at: nowIso(),
      });
    });
  }

  function toggleAccount(platform: Platform) {
    const existing = accounts.find((a) => a.platform === platform);
    upsertPlatformAccount({
      id: existing?.id ?? uid('pa'),
      establishmentId: activeId,
      platform,
      connected: !existing?.connected,
      handle: existing?.handle,
      connectedAt: !existing?.connected ? nowIso() : existing?.connectedAt,
    });
  }

  return (
    <div>
      <PageHeader
        title="Publications"
        description="Programmez ou marquez vos contenus comme publiés. La connexion API réelle se fait dans Paramètres."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {(['facebook', 'instagram', 'linkedin', 'google'] as Platform[]).map((pl) => {
          const acc = accounts.find((a) => a.platform === pl);
          return (
            <Card key={pl}>
              <CardBody className="flex items-center justify-between gap-2">
                <div>
                  <PlatformBadge platform={pl} />
                  <div className="mt-1 text-xs text-ink-500">
                    {acc?.connected ? 'Connecté (mock)' : 'Non connecté'}
                  </div>
                </div>
                <Button size="sm" variant={acc?.connected ? 'outline' : 'primary'} onClick={() => toggleAccount(pl)}>
                  {acc?.connected ? 'Déconnecter' : 'Connecter'}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Validés — à programmer</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {ready.length === 0 ? (
              <p className="text-sm text-ink-500">Aucun contenu validé pour l'instant.</p>
            ) : (
              ready.map((p) => (
                <div key={p.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>{formatDateFr(p.date)} · {p.time}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="line-clamp-2 text-ink-800">{p.versions[0]?.text}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {p.platforms.map((pl) => (
                        <PlatformBadge key={pl} platform={pl} />
                      ))}
                    </div>
                    <Button size="sm" onClick={() => schedule(p.id)}>
                      <CalendarClock size={14} /> Programmer
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programmés</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {scheduled.length === 0 ? (
              <p className="text-sm text-ink-500">Aucune programmation.</p>
            ) : (
              scheduled.map((p) => (
                <div key={p.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>{formatDateFr(p.date)} · {p.time}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="line-clamp-2 text-ink-800">{p.versions[0]?.text}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {p.platforms.map((pl) => (
                        <PlatformBadge key={pl} platform={pl} />
                      ))}
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => markPublished(p.id)}>
                      <CheckCircle2 size={14} /> Marquer publié
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {published.length === 0 ? (
              <p className="text-sm text-ink-500">Aucune publication.</p>
            ) : (
              published.map((p) => (
                <div key={p.id} className="rounded-lg border border-ink-100 p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                    <span>{p.publishedAt ? formatDateFr(p.publishedAt) : formatDateFr(p.date)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="line-clamp-2 text-ink-800">{p.versions[0]?.text}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {publications.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Journal d'événements</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-1 text-xs text-ink-600">
              {publications.slice(0, 20).map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 border-b border-ink-100 py-1 last:border-none">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={l.platform} />
                    <span>{l.status}</span>
                    {l.message ? <span className="text-ink-500">— {l.message}</span> : null}
                  </div>
                  <span className="text-ink-400">{formatDateFr(l.at)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
