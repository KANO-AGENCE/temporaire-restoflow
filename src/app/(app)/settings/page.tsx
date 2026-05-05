'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import type { Platform, Tone } from '@/types';

const TONES: Tone[] = ['premium', 'familial', 'fun', 'local', 'elegant', 'accessible'];
const PLATFORMS: Platform[] = ['instagram', 'facebook', 'linkedin', 'google'];

export default function SettingsPage() {
  const { user, settings, updateSettings, resetDemo, reseedDemo } = useAppStore();
  const [openaiKey, setOpenaiKey] = useState(settings.apiKeys?.openai ?? '');

  function togglePlatform(p: Platform) {
    const list = settings.defaultPlatforms ?? [];
    updateSettings({
      defaultPlatforms: list.includes(p) ? list.filter((x) => x !== p) : [...list, p],
    });
  }

  return (
    <div>
      <PageHeader title="Paramètres" description="Profil, préférences IA, plateformes." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil utilisateur</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Nom" defaultValue={user?.name ?? ''} disabled />
            <Input label="Email" defaultValue={user?.email ?? ''} disabled />
            <p className="text-xs text-ink-500">
              Auth démo locale. Branchez Supabase via .env.local pour activer la vraie authentification.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences IA</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Select
              label="Ton global"
              value={settings.preferredTone ?? 'accessible'}
              onChange={(e) => updateSettings({ preferredTone: e.target.value as Tone })}
            >
              {TONES.map((t) => (
                <option key={t} value={t} className="capitalize">{t}</option>
              ))}
            </Select>
            <Select
              label="Fréquence de génération"
              value={settings.generationFrequency ?? 'weekly'}
              onChange={(e) =>
                updateSettings({ generationFrequency: e.target.value as 'weekly' | 'monthly' })
              }
            >
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </Select>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-700">Plateformes par défaut</label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const checked = settings.defaultPlatforms?.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        checked
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-ink-200 text-ink-600 hover:bg-ink-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Clés API</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input
              label="OpenAI API key"
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-…"
              hint="Pour activer la génération réelle, configurez OPENAI_API_KEY dans .env.local côté serveur."
            />
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  updateSettings({ apiKeys: { ...(settings.apiKeys ?? {}), openai: openaiKey } })
                }
              >
                Enregistrer
              </Button>
            </div>
            <div className="rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
              <p className="font-medium text-ink-800">Comment activer l'IA et Supabase réels ?</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5">
                <li>Copier <code>.env.local.example</code> en <code>.env.local</code>.</li>
                <li>Renseigner <code>OPENAI_API_KEY</code> et les variables Supabase.</li>
                <li>Relancer <code>npm run dev</code>.</li>
              </ol>
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Zone de réinitialisation</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-600">
                Recharger les données démo Joe Carpa (remplace les établissements et posts actuels par le seed Joe Carpa).
              </p>
              <Button
                onClick={() => {
                  if (confirm('Recharger Joe Carpa ? Vos données locales actuelles seront remplacées.')) reseedDemo();
                }}
              >
                Recharger Joe Carpa
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
              <p className="text-sm text-ink-600">
                Vider toutes les données locales (établissements, posts, médias) sans rechargement.
              </p>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm('Réinitialiser ? Cette action est irréversible.')) resetDemo();
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
