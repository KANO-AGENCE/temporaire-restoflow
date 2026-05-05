'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, ShieldCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Textarea } from '@/components/ui/Input';
import { PlatformBadge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { formatDateFr } from '@/lib/utils';

export default function ValidationPage() {
  const { posts, media, establishments, activeEstablishmentId, decideValidation, updatePost } =
    useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const pending = posts
    .filter((p) => (active ? p.establishmentId === active.id : true))
    .filter((p) => p.status === 'a-valider');
  const [comments, setComments] = useState<Record<string, string>>({});

  function find(id?: string) {
    return id ? media.find((m) => m.id === id) : null;
  }

  return (
    <div>
      <PageHeader
        title="Validation"
        description="Aucune publication n'est diffusée sans validation humaine. Modifiez, validez ou refusez chaque contenu."
      />

      {pending.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title="Tout est validé"
          description="Aucun contenu en attente. Générez de nouveaux posts depuis le calendrier ou l'onglet Création."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((p) => {
            const m = find(p.mediaId);
            return (
              <Card key={p.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span className="font-medium text-ink-800">{formatDateFr(p.date)}</span>
                      <span>· {p.time}</span>
                      <span className="capitalize">· {p.objective}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.platforms.map((pl) => (
                        <PlatformBadge key={pl} platform={pl} />
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                    {m ? (
                      <div className="relative h-28 w-full overflow-hidden rounded-lg border border-ink-100 sm:h-full">
                        <Image src={m.url} alt="" fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="grid h-28 place-items-center rounded-lg border border-dashed border-ink-200 text-xs text-ink-400 sm:h-full">
                        Pas de visuel
                      </div>
                    )}
                    <div className="space-y-2">
                      {p.versions.map((v) => (
                        <div key={v.platform} className="rounded-md border border-ink-100 p-2 text-sm">
                          <div className="mb-1 flex items-center gap-2">
                            <PlatformBadge platform={v.platform} />
                          </div>
                          <Textarea
                            defaultValue={v.text}
                            onChange={(e) => {
                              const newVersions = p.versions.map((vv) =>
                                vv.platform === v.platform ? { ...vv, text: e.target.value } : vv
                              );
                              updatePost(p.id, { versions: newVersions });
                            }}
                            className="min-h-[64px] text-xs"
                          />
                          {v.hashtags.length > 0 ? (
                            <p className="mt-1 text-[11px] text-brand-600">{v.hashtags.join(' ')}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Textarea
                    placeholder="Commentaire (facultatif) — visible dans le post si refusé"
                    value={comments[p.id] ?? ''}
                    onChange={(e) => setComments((c) => ({ ...c, [p.id]: e.target.value }))}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => decideValidation(p.id, 'rejected', comments[p.id])}
                    >
                      <X size={16} /> Refuser
                    </Button>
                    <Button onClick={() => decideValidation(p.id, 'approved', comments[p.id])}>
                      <Check size={16} /> Valider
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
