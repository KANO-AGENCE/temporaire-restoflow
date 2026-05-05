'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Images, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pill } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { formatDateFr, nowIso, uid } from '@/lib/utils';
import type { MediaFile } from '@/types';

type Filter = 'all' | 'ai' | 'upload';

export default function MediaPage() {
  const { establishments, activeEstablishmentId, media, addMedia, removeMedia } = useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const [filter, setFilter] = useState<Filter>('all');

  if (!active) {
    return (
      <div>
        <PageHeader title="Médiathèque" />
        <EmptyState icon={<Images size={28} />} title="Sélectionnez un établissement" />
      </div>
    );
  }

  const items = media
    .filter((m) => m.establishmentId === active.id)
    .filter((m) => (filter === 'all' ? true : m.source === filter))
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const m: MediaFile = {
          id: uid('med'),
          establishmentId: active.id,
          url: String(reader.result),
          source: 'upload',
          uploadedAt: nowIso(),
          alt: file.name,
        };
        addMedia(m);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  return (
    <div>
      <PageHeader
        title="Médiathèque"
        description="Centralisez vos visuels (organiques et IA), classés par établissement."
        actions={
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Upload size={16} /> Importer
            <input type="file" multiple accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        }
      />

      <div className="mb-4 flex gap-2">
        {(['all', 'upload', 'ai'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filter === f
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-ink-200 hover:bg-ink-50'
            }`}
          >
            {f === 'all' ? 'Tous' : f === 'ai' ? 'IA' : 'Organiques'}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Images size={28} />}
          title="Médiathèque vide"
          description="Importez vos premières photos ou générez des images depuis Création de contenus."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <Card key={m.id} className="overflow-hidden">
              <div className="relative aspect-square">
                <Image src={m.url} alt={m.alt ?? ''} fill className="object-cover" unoptimized />
              </div>
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Pill className={m.source === 'ai' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'}>
                    {m.source === 'ai' ? 'IA' : 'Organique'}
                  </Pill>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce visuel ?')) removeMedia(m.id);
                    }}
                    className="text-ink-400 hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-[11px] text-ink-500">{formatDateFr(m.uploadedAt)}</div>
                {m.prompt ? (
                  <div className="line-clamp-2 text-[11px] text-ink-500">{m.prompt}</div>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
