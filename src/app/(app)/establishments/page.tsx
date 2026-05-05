'use client';

import { FormEvent, useState } from 'react';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
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

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(e: Establishment) {
    setEditing(e);
    setOpen(true);
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
