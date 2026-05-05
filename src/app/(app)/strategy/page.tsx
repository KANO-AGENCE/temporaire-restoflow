'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lock,
  Radar,
  Save,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Input';
import { PlatformBadge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { formatDateFr, nowIso, uid } from '@/lib/utils';
import type { Post, Questionnaire, WatchContext } from '@/types';

type AnswerMap = Record<string, string | string[] | boolean>;

export default function StrategyPage() {
  const {
    establishments,
    activeEstablishmentId,
    watches,
    questionnaires,
    answers,
    settings,
    addWatch,
    addQuestionnaire,
    saveAnswers,
    addPosts,
  } = useAppStore();
  const active = establishments.find((e) => e.id === activeEstablishmentId);
  const watch = watches.find((w) => w.establishmentId === active?.id);
  const questionnaire = questionnaires.find((q) => q.establishmentId === active?.id);
  const lastAnswers = questionnaire ? answers.find((a) => a.questionnaireId === questionnaire.id) : null;

  const [contextLoading, setContextLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<AnswerMap>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategyResult, setStrategyResult] = useState<{ summary: string; posts: Post[] } | null>(null);
  const [watchOpen, setWatchOpen] = useState(false);

  useEffect(() => {
    setDraft(lastAnswers?.answers ?? {});
    setSaved(!!lastAnswers);
  }, [lastAnswers?.id]);

  useEffect(() => {
    if (!active) return;
    if (!watch || !questionnaire) {
      void loadContext();
    }
  }, [active?.id]);

  async function loadContext(force = false) {
    if (!active) return;
    setContextLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'context', establishment: active }),
      });
      if (!res.ok) throw new Error('Veille indisponible');
      const data: { watch: WatchContext; questionnaire: Questionnaire } = await res.json();
      if (force || !watch) addWatch(data.watch);
      if (force || !questionnaire) addQuestionnaire(data.questionnaire);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setContextLoading(false);
    }
  }

  function update(id: string, value: string | string[] | boolean) {
    setDraft((d) => ({ ...d, [id]: value }));
    setSaved(false);
  }

  function persistAnswers() {
    if (!questionnaire) return;
    saveAnswers({
      id: uid('ans'),
      questionnaireId: questionnaire.id,
      answers: draft,
      submittedAt: nowIso(),
    });
    setSaved(true);
  }

  const answersCount = useMemo(
    () => Object.values(draft).filter((v) => (Array.isArray(v) ? v.length > 0 : v !== '' && v !== undefined)).length,
    [draft]
  );
  const totalQuestions = questionnaire?.questions.length ?? 0;
  const minRequired = Math.max(3, Math.ceil(totalQuestions * 0.4));
  const canGenerate = saved && answersCount >= minRequired;

  async function runFullStrategy() {
    if (!active || !watch || !canGenerate) return;
    setGenerating(true);
    setError(null);
    setStrategyResult(null);
    try {
      const res = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          establishment: active,
          watch,
          answers: draft,
          defaultPlatforms: settings.defaultPlatforms,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Génération impossible');
      }
      const data: { summary: string; posts: Post[] } = await res.json();
      setStrategyResult(data);
      addPosts(data.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setGenerating(false);
    }
  }

  if (!active) {
    return (
      <div>
        <PageHeader title="Stratégie & Génération" />
        <EmptyState
          icon={<Sparkles size={28} />}
          title="Sélectionnez un établissement"
          description="Le pipeline analyse l'établissement, construit une veille, vous interroge, puis produit la stratégie éditoriale complète."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Stratégie & Génération"
        description="Pipeline unique : veille → questionnaire → calendrier + posts. Aucune génération isolée."
      />

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        {/* BLOC 1 — VEILLE */}
        <Card className="lg:col-span-12">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">1</span>
                <Radar size={16} /> Contexte & veille
                {watch ? <CheckCircle2 size={16} className="text-emerald-600" /> : null}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {watch ? (
                <button
                  onClick={() => setWatchOpen((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-1 text-xs hover:bg-ink-50"
                >
                  {watchOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {watchOpen ? 'Réduire' : 'Détails'}
                </button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => loadContext(true)} loading={contextLoading}>
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {!watch ? (
              <div className="text-sm text-ink-500">
                {contextLoading ? 'Analyse du contexte en cours…' : 'Lancement automatique de la veille…'}
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-ink-700">{watch.summary}</p>
                {watchOpen ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-ink-500">Tendances</div>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {(Array.isArray(watch.nationalTrends) ? watch.nationalTrends : [])
                          .slice(0, 4)
                          .map((t, i) => (
                            <li key={i} className="flex gap-1.5"><span className="text-brand-500">•</span> {t}</li>
                          ))}
                      </ul>
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-ink-500">Saisonnalité & journées</div>
                      <p className="text-sm text-ink-700">{watch.seasonality}</p>
                      {Array.isArray(watch.worldDays) && watch.worldDays.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-xs text-ink-600">
                          {watch.worldDays.map((d, i) => (
                            <li key={i}>· {d.label} {d.date ? `(${d.date})` : ''}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div>
                      <div className="mb-1 text-xs font-semibold uppercase text-ink-500">Opportunités</div>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {[
                          ...(Array.isArray(watch.localEvents) ? watch.localEvents : []),
                          ...(Array.isArray(watch.commercialEvents) ? watch.commercialEvents : []),
                          ...(Array.isArray(watch.sportsCulture) ? watch.sportsCulture : []),
                        ]
                          .slice(0, 5)
                          .map((d, i) => (
                            <li key={i} className="flex gap-1.5"><span className="text-brand-500">•</span> {d.label}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>

        {/* BLOC 2 — QUESTIONNAIRE */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">2</span>
                <ClipboardList size={16} /> Questionnaire
                {saved ? <CheckCircle2 size={16} className="text-emerald-600" /> : null}
              </span>
            </CardTitle>
            <span className="text-xs text-ink-500">
              {answersCount}/{totalQuestions} renseigné{answersCount > 1 ? 's' : ''}
            </span>
          </CardHeader>
          <CardBody>
            {!questionnaire ? (
              <div className="text-sm text-ink-500">
                {contextLoading ? 'Génération du questionnaire…' : 'Le questionnaire sera généré dès que la veille est prête.'}
              </div>
            ) : (
              <div className="space-y-4">
                {questionnaire.questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-ink-800">{q.question}</label>
                    {q.helper ? <p className="text-xs text-ink-500">{q.helper}</p> : null}

                    {q.type === 'text' && (
                      <Input
                        value={(draft[q.id] as string) ?? ''}
                        onChange={(e) => update(q.id, e.target.value)}
                      />
                    )}
                    {q.type === 'textarea' && (
                      <Textarea
                        value={(draft[q.id] as string) ?? ''}
                        onChange={(e) => update(q.id, e.target.value)}
                      />
                    )}
                    {q.type === 'boolean' && (
                      <div className="flex gap-2">
                        {[
                          { v: true, l: 'Oui' },
                          { v: false, l: 'Non' },
                        ].map(({ v, l }) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => update(q.id, v)}
                            className={`rounded-lg border px-3 py-1.5 text-sm ${
                              draft[q.id] === v
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-ink-200 hover:bg-ink-50'
                            }`}
                          >
                            {l}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === 'choice' && q.options && (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => update(q.id, o)}
                            className={`rounded-lg border px-3 py-1.5 text-sm ${
                              draft[q.id] === o
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-ink-200 hover:bg-ink-50'
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === 'multi' && q.options && (
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o) => {
                          const arr = (draft[q.id] as string[]) ?? [];
                          const checked = arr.includes(o);
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() =>
                                update(q.id, checked ? arr.filter((x) => x !== o) : [...arr, o])
                              }
                              className={`rounded-lg border px-3 py-1.5 text-sm ${
                                checked
                                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                                  : 'border-ink-200 hover:bg-ink-50'
                              }`}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-2">
                  <span className="text-xs text-ink-500">
                    Minimum {minRequired} réponses pour débloquer la génération.
                  </span>
                  <Button onClick={persistAnswers} disabled={answersCount === 0}>
                    <Save size={16} /> Enregistrer
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* BLOC 3 — RÉSULTATS */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>
              <span className="inline-flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">3</span>
                <Sparkles size={16} /> Stratégie éditoriale
              </span>
            </CardTitle>
          </CardHeader>
          <CardBody>
            {!canGenerate ? (
              <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50 p-4 text-sm text-ink-600">
                <div className="flex items-center gap-2 font-medium text-ink-700">
                  <Lock size={14} /> En attente
                </div>
                <p className="mt-1 text-xs leading-relaxed">
                  Aucune génération n'est possible tant que la veille et le questionnaire ne sont pas complétés.
                  Le calendrier et les posts seront produits comme conséquence directe de votre stratégie.
                </p>
              </div>
            ) : (
              <Button onClick={runFullStrategy} loading={generating} className="w-full">
                <Wand2 size={16} /> Générer la stratégie complète
              </Button>
            )}

            {strategyResult ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg bg-brand-50/60 p-3 text-sm leading-relaxed text-ink-800">
                  {strategyResult.summary}
                </div>
                <div className="text-xs font-semibold uppercase text-ink-500">
                  {strategyResult.posts.length} publications créées
                </div>
                <div className="space-y-2">
                  {strategyResult.posts.map((p) => (
                    <div key={p.id} className="rounded-lg border border-ink-100 p-2.5 text-sm">
                      <div className="flex items-center justify-between text-xs text-ink-500">
                        <span className="font-medium text-ink-800">
                          {formatDateFr(p.date)} · {p.time}
                        </span>
                        <span className="capitalize">{p.objective}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-ink-700">
                        {p.versions[0]?.text}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {p.platforms.map((pl) => (
                          <PlatformBadge key={pl} platform={pl} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-500">
                  Les publications sont automatiquement envoyées en validation. Retrouvez-les dans
                  l'onglet <strong>Validation</strong> et le <strong>Calendrier</strong>.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
