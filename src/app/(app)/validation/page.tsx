'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  Eye,
  ImageOff,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { PlatformBadge } from '@/components/ui/Badge';
import { PostPreviewModal } from '@/components/social-preview/PostPreviewModal';
import { useAppStore } from '@/lib/store';
import { formatDateFr, nowIso, uid } from '@/lib/utils';
import type { MediaFile, Platform, Post } from '@/types';

export default function ValidationPage() {
  const {
    posts,
    media,
    establishments,
    activeEstablishmentId,
    decideValidation,
    updatePost,
    addMedia,
  } = useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const pending = posts
    .filter((p) => (active ? p.establishmentId === active.id : true))
    .filter((p) => p.status === 'a-valider');
  const [comments, setComments] = useState<Record<string, string>>({});
  const [pickerPostId, setPickerPostId] = useState<string | null>(null);
  const [previewPostId, setPreviewPostId] = useState<string | null>(null);
  const editingPost = pickerPostId ? posts.find((p) => p.id === pickerPostId) : null;
  const previewPost = previewPostId ? posts.find((p) => p.id === previewPostId) : null;

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

                  <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    {/* VISUEL — clic ouvre le picker */}
                    <button
                      type="button"
                      onClick={() => setPickerPostId(p.id)}
                      className="group relative h-32 w-full overflow-hidden rounded-lg border border-ink-100 bg-ink-50 sm:h-full"
                      title="Changer le visuel"
                    >
                      {m ? (
                        <>
                          <Image
                            src={m.url}
                            alt={m.alt ?? ''}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/0 text-xs font-medium text-white opacity-0 transition group-hover:bg-ink-900/40 group-hover:opacity-100">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] text-ink-900">
                              <ImagePlus size={12} /> Changer
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 text-ink-400">
                          <ImageOff size={20} />
                          <span className="text-[11px]">Cliquer pour ajouter</span>
                        </div>
                      )}
                    </button>
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

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPreviewPostId(p.id)}
                    >
                      <Eye size={16} /> Aperçu
                    </Button>
                    <div className="flex gap-2">
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
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <ImagePickerModal
        post={editingPost ?? null}
        media={media}
        establishmentId={active?.id ?? null}
        onClose={() => setPickerPostId(null)}
        onSelect={(mediaId) => {
          if (!editingPost) return;
          updatePost(editingPost.id, { mediaId });
        }}
        onAddMedia={(m) => addMedia(m)}
      />

      {/* APERÇU SOCIAL — visualise le post comme dans le feed Instagram / Facebook / LinkedIn / Google */}
      <PostPreviewModal
        open={!!previewPost}
        onClose={() => setPreviewPostId(null)}
        post={previewPost ?? null}
        establishment={active ?? null}
        media={media}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Picker — galerie organique + régénération IA + upload rapide
 * ──────────────────────────────────────────────────────────── */

interface ImagePickerModalProps {
  post: Post | null;
  media: MediaFile[];
  establishmentId: string | null;
  onClose: () => void;
  onSelect: (mediaId: string) => void;
  onAddMedia: (m: MediaFile) => void;
}

function ImagePickerModal({
  post,
  media,
  establishmentId,
  onClose,
  onSelect,
  onAddMedia,
}: ImagePickerModalProps) {
  const [tab, setTab] = useState<'organic' | 'ai'>('organic');
  const [prompt, setPrompt] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise le prompt à l'ouverture (sur le prompt initial du post)
  useEffect(() => {
    if (!post) return;
    setPrompt(post.imagePrompt ?? post.visualIdea ?? '');
    setError(null);
    setTab('organic');
  }, [post?.id]);

  if (!post) return null;

  const orgItems = media
    .filter((m) => m.establishmentId === establishmentId)
    .filter((m) => m.source === 'upload')
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const aiItems = media
    .filter((m) => m.establishmentId === establishmentId)
    .filter((m) => m.source === 'ai')
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  function quickUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!establishmentId) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const m: MediaFile = {
          id: uid('med'),
          establishmentId,
          url: String(reader.result),
          source: 'upload',
          uploadedAt: nowIso(),
          alt: file.name,
        };
        onAddMedia(m);
        // Auto-sélectionne le nouveau visuel pour le post courant
        onSelect(m.id);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  async function regenerate() {
    if (!post || !establishmentId) return;
    const finalPrompt = prompt.trim();
    if (!finalPrompt) {
      setError('Le prompt ne peut pas être vide.');
      return;
    }
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/image/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          platforms: post.platforms as Platform[],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Régénération impossible');
      }
      const data: { url: string; prompt: string } = await res.json();
      const m: MediaFile = {
        id: uid('med'),
        establishmentId,
        url: data.url,
        source: 'ai',
        prompt: data.prompt,
        uploadedAt: nowIso(),
        alt: post.visualIdea,
      };
      onAddMedia(m);
      onSelect(m.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Modal open={!!post} onClose={onClose} title="Visuel du post" size="xl">
      <div className="space-y-4">
        {/* Onglets */}
        <div className="flex items-center gap-1 rounded-lg bg-ink-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('organic')}
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              tab === 'organic' ? 'bg-white shadow text-ink-900' : 'text-ink-600 hover:text-ink-800'
            }`}
          >
            📸 Photos organiques ({orgItems.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex-1 rounded-md px-3 py-1.5 transition ${
              tab === 'ai' ? 'bg-white shadow text-ink-900' : 'text-ink-600 hover:text-ink-800'
            }`}
          >
            ✨ Régénérer IA
          </button>
        </div>

        {tab === 'organic' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-ink-500">
                Tes photos organiques pour cet établissement. Clique pour appliquer.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs hover:bg-ink-50">
                <Upload size={12} /> Importer
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={quickUpload}
                />
              </label>
            </div>
            {orgItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50 p-6 text-center text-sm text-ink-500">
                Aucune photo organique pour cet établissement. Clique sur « Importer » ou ajoute-les
                depuis la Médiathèque.
              </div>
            ) : (
              <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
                {orgItems.map((m) => {
                  const selected = m.id === post.mediaId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelect(m.id);
                        onClose();
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-lg border transition ${
                        selected
                          ? 'border-brand-500 ring-2 ring-brand-200'
                          : 'border-ink-100 hover:border-brand-300'
                      }`}
                    >
                      <Image
                        src={m.url}
                        alt={m.alt ?? ''}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {selected ? (
                        <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white">
                          <Check size={12} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {aiItems.length > 0 ? (
              <details className="rounded-lg border border-ink-100 bg-ink-50/40 p-3">
                <summary className="cursor-pointer text-xs font-medium text-ink-700">
                  Visuels IA déjà générés ({aiItems.length})
                </summary>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {aiItems.map((m) => {
                    const selected = m.id === post.mediaId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelect(m.id);
                          onClose();
                        }}
                        className={`relative aspect-square overflow-hidden rounded-md border transition ${
                          selected
                            ? 'border-brand-500 ring-2 ring-brand-200'
                            : 'border-ink-100 hover:border-brand-300'
                        }`}
                      >
                        <Image
                          src={m.url}
                          alt={m.alt ?? ''}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {selected ? (
                          <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                            <Check size={10} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </details>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink-700">Prompt visuel</label>
              <Textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Décris la scène: produit, ambiance, lumière, cadrage…"
              />
              <p className="text-[11px] text-ink-500">
                Format : {pickFormatLabel(post.platforms as Platform[])}.
              </p>
            </div>
            {error ? (
              <p className="text-xs text-red-600">{error}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button onClick={regenerate} loading={regenerating} disabled={regenerating}>
                <Sparkles size={14} /> Régénérer
              </Button>
            </div>
            {regenerating ? (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                <RefreshCw size={11} className="mr-1 inline animate-spin" />
                Génération de l&apos;image en cours… (10-30 secondes selon la charge OpenAI)
              </p>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}

function pickFormatLabel(platforms: Platform[]): string {
  if (platforms.length === 0) return 'carré 1:1';
  const onlyLandscape = platforms.every((p) => p === 'linkedin' || p === 'google');
  return onlyLandscape ? 'paysage 3:2 (LinkedIn / Google)' : 'carré 1:1 (Instagram / Facebook)';
}
