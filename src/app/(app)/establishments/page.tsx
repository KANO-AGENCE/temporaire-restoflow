'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Building2, Pencil, Plus, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAppStore } from '@/lib/store';
import { nowIso, uid } from '@/lib/utils';
import type { Establishment, Positioning, Tone } from '@/types';

const POSITIONS: Positioning[] = [
  'gastronomique',
  'traditionnel',
  'brasserie',
  'fast-food',
  'bar',
  'cafe',
  'bistrot',
  'pizzeria',
];
const TONES: Tone[] = ['premium', 'familial', 'fun', 'local', 'elegant', 'accessible'];

const DAYS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

export default function EstablishmentsPage() {
  const { establishments, user, media, addEstablishment, updateEstablishment, removeEstablishment } =
    useAppStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Establishment | null>(null);

  // Carte permanente — état local du modal (séparé du form non-contrôlé)
  const [menuItems, setMenuItems] = useState<string[]>([]);
  const [menuRaw, setMenuRaw] = useState('');
  const [newDish, setNewDish] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Reset / hydratation à l'ouverture du modal
  useEffect(() => {
    if (!open) return;
    setMenuItems(editing?.menuItems ?? []);
    setMenuRaw('');
    setNewDish('');
    setMenuError(null);
  }, [open, editing?.id]);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(e: Establishment) {
    setEditing(e);
    setOpen(true);
  }

  async function extractDishes() {
    const text = menuRaw.trim();
    if (!text) {
      setMenuError('Collez d\'abord le contenu de votre carte ci-dessus.');
      return;
    }
    setExtracting(true);
    setMenuError(null);
    try {
      const res = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Extraction impossible');
      }
      const data: { dishes: string[] } = await res.json();
      // Fusion sans doublons (case-insensitive)
      const seen = new Set(menuItems.map((d) => d.toLowerCase()));
      const merged = [...menuItems];
      for (const d of data.dishes ?? []) {
        const k = d.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(d);
        }
      }
      setMenuItems(merged);
      setMenuRaw('');
    } catch (err) {
      setMenuError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setExtracting(false);
    }
  }

  function addDishManually() {
    const v = newDish.trim();
    if (!v) return;
    if (menuItems.some((d) => d.toLowerCase() === v.toLowerCase())) {
      setNewDish('');
      return;
    }
    setMenuItems([...menuItems, v]);
    setNewDish('');
  }

  function removeDish(idx: number) {
    setMenuItems(menuItems.filter((_, i) => i !== idx));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const days = DAYS.filter((d) => fd.get(`day_${d}`) === 'on');
    const patch: Partial<Establishment> = {
      name: String(fd.get('name') ?? ''),
      city: String(fd.get('city') ?? ''),
      address: String(fd.get('address') ?? ''),
      cuisineType: String(fd.get('cuisineType') ?? ''),
      positioning: (fd.get('positioning') as Positioning) || undefined,
      tone: (fd.get('tone') as Tone) || undefined,
      targetAudience: String(fd.get('targetAudience') ?? ''),
      openingDays: days,
      hours: String(fd.get('hours') ?? ''),
      specialties: String(fd.get('specialties') ?? ''),
      recurringOffers: String(fd.get('recurringOffers') ?? ''),
      socialLinks: {
        facebook: String(fd.get('facebook') ?? ''),
        instagram: String(fd.get('instagram') ?? ''),
        linkedin: String(fd.get('linkedin') ?? ''),
        googleBusiness: String(fd.get('googleBusiness') ?? ''),
      },
      brandGuidelines: String(fd.get('brandGuidelines') ?? ''),
      menuItems,
    };
    if (editing) {
      updateEstablishment(editing.id, patch);
    } else {
      addEstablishment({
        ...patch,
        id: uid('est'),
        userId: user.id,
        createdAt: nowIso(),
        name: patch.name ?? '',
        city: patch.city ?? '',
      } as Establishment);
    }
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Établissements"
        description="Gérez le profil de chaque restaurant. L'IA s'appuie sur ces informations pour adapter ses contenus."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Ajouter un établissement
          </Button>
        }
      />

      {establishments.length === 0 ? (
        <EmptyState
          icon={<Building2 size={28} />}
          title="Pas encore d'établissement"
          description="Ajoutez votre premier restaurant pour démarrer la veille et la génération de contenus."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Créer un établissement
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {establishments.map((e) => {
            const cover = media.find((m) => m.establishmentId === e.id)?.url;
            return (
              <Card key={e.id} className="overflow-hidden">
                <div
                  className="relative h-32 bg-cover bg-center"
                  style={{
                    backgroundImage: cover
                      ? `url(${cover})`
                      : 'linear-gradient(135deg, #5c2f12 0%, #a4521a 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-plate-gradient" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
                    <div className="min-w-0">
                      <div className="font-display text-lg leading-tight">{e.name}</div>
                      <div className="text-[11px] uppercase tracking-wide text-ink-100/85">
                        {e.city} {e.cuisineType ? `· ${e.cuisineType}` : ''}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="rounded-lg bg-white/15 p-1.5 text-white backdrop-blur hover:bg-white/25"
                        title="Modifier"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer "${e.name}" ?`)) removeEstablishment(e.id);
                        }}
                        className="rounded-lg bg-white/15 p-1.5 text-white backdrop-blur hover:bg-red-500/80"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <CardBody>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-ink-400">Positionnement</div>
                      <div className="capitalize">{e.positioning ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-ink-400">Ton</div>
                      <div className="capitalize">{e.tone ?? '—'}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-ink-400">Spécialités</div>
                      <div className="line-clamp-2">{e.specialties || '—'}</div>
                    </div>
                    {e.brandGuidelines ? (
                      <div className="col-span-2 mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 w-fit">
                        Playbook éditorial configuré
                      </div>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Modifier l\'établissement' : 'Nouvel établissement'}
        size="lg"
      >
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <Input label="Nom du restaurant" name="name" required defaultValue={editing?.name} />
          <Input label="Ville" name="city" required defaultValue={editing?.city} />
          <Input label="Adresse" name="address" defaultValue={editing?.address} className="md:col-span-2" />
          <Input label="Type de cuisine" name="cuisineType" defaultValue={editing?.cuisineType} />
          <Select label="Positionnement" name="positioning" defaultValue={editing?.positioning ?? ''}>
            <option value="">—</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </Select>
          <Select label="Ton" name="tone" defaultValue={editing?.tone ?? ''}>
            <option value="">—</option>
            {TONES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </Select>
          <Input label="Clientèle cible" name="targetAudience" defaultValue={editing?.targetAudience} />
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-ink-700">Jours d'ouverture</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <label
                  key={d}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs uppercase has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                >
                  <input
                    type="checkbox"
                    name={`day_${d}`}
                    defaultChecked={editing?.openingDays?.includes(d)}
                    className="accent-brand-600"
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <Input label="Horaires" name="hours" defaultValue={editing?.hours} placeholder="12h-14h / 19h-22h" />
          <Input label="Offres récurrentes" name="recurringOffers" defaultValue={editing?.recurringOffers} />
          <Textarea
            label="Spécialités"
            name="specialties"
            defaultValue={editing?.specialties}
            className="md:col-span-2"
          />
          <Input label="Facebook" name="facebook" defaultValue={editing?.socialLinks?.facebook} />
          <Input label="Instagram" name="instagram" defaultValue={editing?.socialLinks?.instagram} />
          <Input label="LinkedIn" name="linkedin" defaultValue={editing?.socialLinks?.linkedin} />
          <Input label="Google Business" name="googleBusiness" defaultValue={editing?.socialLinks?.googleBusiness} />
          {/* CARTE PERMANENTE — paste + extraction IA + édition manuelle */}
          <div className="md:col-span-2 space-y-3 rounded-xl border border-ink-200 bg-ink-50/40 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-ink-800">
                <Utensils size={16} className="text-brand-700" /> Carte permanente
                {menuItems.length > 0 ? (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    {menuItems.length} plat{menuItems.length > 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-ink-500">
              Ces plats alimentent le sélecteur « Choisir un plat » du questionnaire stratégie.
              Collez le texte de votre carte (PDF, Word, site) puis laissez l&apos;IA extraire,
              ou ajoutez vos plats manuellement.
            </p>

            <div className="space-y-2">
              <Textarea
                rows={4}
                placeholder={'Collez ici le texte de votre carte (entrées, plats, desserts)…\nL\'IA extraira automatiquement les noms de plats, sans prix ni description.'}
                value={menuRaw}
                onChange={(e) => setMenuRaw(e.target.value)}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-ink-500">
                  {menuRaw.length} / 20 000 caractères
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={extractDishes}
                  loading={extracting}
                  disabled={extracting || menuRaw.trim().length === 0}
                >
                  <Sparkles size={14} /> Extraire avec l&apos;IA
                </Button>
              </div>
              {menuError ? (
                <p className="text-xs text-red-600">{menuError}</p>
              ) : null}
            </div>

            {/* Ajout manuel */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Ajouter un plat manuellement…"
                  value={newDish}
                  onChange={(e) => setNewDish(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDishManually();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDishManually}
                disabled={newDish.trim().length === 0}
              >
                <Plus size={14} /> Ajouter
              </Button>
            </div>

            {/* Liste éditable des plats */}
            {menuItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ink-200 bg-white px-3 py-2 text-xs italic text-ink-500">
                Aucun plat enregistré. Collez votre carte ou ajoutez vos plats un à un.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {menuItems.map((dish, i) => (
                  <span
                    key={`${dish}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2 py-1 text-xs text-ink-800"
                  >
                    <span className="max-w-[260px] truncate">{dish}</span>
                    <button
                      type="button"
                      onClick={() => removeDish(i)}
                      className="rounded-full p-0.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                      title="Retirer ce plat"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Textarea
            label="Charte / consignes de marque"
            name="brandGuidelines"
            defaultValue={editing?.brandGuidelines}
            className="md:col-span-2"
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
