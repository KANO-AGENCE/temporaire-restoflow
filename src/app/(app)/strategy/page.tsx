'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Lock,
  Newspaper,
  Radar,
  RefreshCw,
  Save,
  Sparkles,
  Utensils,
  Wand2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PlatformBadge } from '@/components/ui/Badge';
import { useAppStore } from '@/lib/store';
import { formatDateFr, nowIso, uid } from '@/lib/utils';
import type { MediaFile, Post, Questionnaire, QuestionnaireQuestion, WatchContext } from '@/types';

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
    addMedia,
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
  const [strategyResult, setStrategyResult] = useState<{ summary: string; posts: Post[]; media?: MediaFile[] } | null>(null);
  const [newsOpen, setNewsOpen] = useState(false);
  const [dishesOpen, setDishesOpen] = useState(false);

  useEffect(() => {
    setDraft(lastAnswers?.answers ?? {});
    setSaved(!!lastAnswers);
  }, [lastAnswers?.id]);

  // Pas d'auto-refresh : la veille n'est lancée QUE par action humaine
  // (clic sur "Lancer la veille" ou "Actualiser").

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

  // Reconstruit toujours `contexte` (issue de la veille) et `plats-carte` (issue de la carte
  // permanente) à partir de l'état COURANT, pour ne jamais dépendre d'un questionnaire mis en
  // cache avant que l'établissement ait sa carte ou avant un refresh de veille.
  const effectiveQuestions = useMemo<QuestionnaireQuestion[]>(() => {
    if (!questionnaire) return [];
    const stripped = questionnaire.questions.filter(
      (q) => q.id !== 'contexte' && q.id !== 'plats-carte'
    );

    const head: QuestionnaireQuestion[] = [];

    if (watch) {
      const items = [
        ...(watch.localEvents ?? []),
        ...(watch.sportsCulture ?? []),
        ...(watch.worldDays ?? []),
        ...(watch.commercialEvents ?? []),
      ];
      const seen = new Set<string>();
      const opts: string[] = [];
      for (const it of items) {
        if (!it?.label) continue;
        const key = `${it.date}|${it.label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const datePrefix = it.date ? `${it.date} — ` : '';
        opts.push(`${datePrefix}${it.label}`);
        if (opts.length >= 14) break;
      }
      if (opts.length > 0) {
        head.push({
          id: 'contexte',
          question: 'Éléments contextuels à intégrer dans la com de cette semaine ?',
          type: 'multi',
          options: opts,
          helper:
            'Issu de la veille. Coche uniquement ce que tu veux exploiter — laisse le reste de côté.',
        });
      }
    }

    if (active && Array.isArray(active.menuItems) && active.menuItems.length > 0) {
      head.push({
        id: 'plats-carte',
        question: 'Plats de la carte à mettre en avant cette semaine ?',
        type: 'multi',
        options: active.menuItems.slice(0, 60),
        helper:
          'Issu de votre carte permanente. Coche uniquement les plats à pousser cette semaine.',
      });
    }

    return [...head, ...stripped];
  }, [questionnaire, watch, active]);

  const answersCount = useMemo(() => {
    const validKeys = new Set(effectiveQuestions.map((q) => q.id));
    return Object.entries(draft).filter(([k, v]) => {
      // Les clés `${id}-detail` sont des compléments de booléens, pas des questions.
      if (!validKeys.has(k)) return false;
      if (Array.isArray(v)) return v.length > 0;
      return v !== '' && v !== undefined;
    }).length;
  }, [draft, effectiveQuestions]);
  const totalQuestions = effectiveQuestions.length;
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
      const data: { summary: string; posts: Post[]; media?: MediaFile[] } = await res.json();
      setStrategyResult(data);
      addPosts(data.posts);
      // Les visuels IA viennent en parallèle des posts — on les enregistre dans
      // la médiathèque pour que la Validation et la page Médiathèque les voient.
      if (Array.isArray(data.media)) {
        for (const m of data.media) addMedia(m);
      }
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadContext(true)}
                  loading={contextLoading}
                >
                  <RefreshCw size={14} /> Actualiser
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardBody>
            {!watch ? (
              <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-ink-200 bg-ink-50/60 p-4">
                <div className="text-sm text-ink-600">
                  {contextLoading
                    ? 'Analyse du contexte en cours…'
                    : "La veille n'est jamais déclenchée automatiquement — lancez-la quand vous le souhaitez."}
                </div>
                <Button
                  size="sm"
                  onClick={() => loadContext(true)}
                  loading={contextLoading}
                  disabled={contextLoading}
                >
                  <Radar size={14} /> Lancer la veille
                </Button>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-ink-700">{watch.summary}</p>
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
                {effectiveQuestions.map((q) => (
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
                      <div className="space-y-2">
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
                        {/* Détail conditionnel — n'apparaît que si la réponse est Oui */}
                        {draft[q.id] === true ? (
                          <div className="ml-1 border-l-2 border-brand-200 pl-3">
                            <Textarea
                              rows={2}
                              placeholder={
                                q.id === 'offre'
                                  ? 'Quelle promo ? (ex: « -20% sur la formule midi », « menu Saint-Valentin à 49€ », « happy hour 18h-20h », « bouteille offerte dès 4 couverts »…)'
                                  : 'Précisez (optionnel)…'
                              }
                              value={(draft[`${q.id}-detail`] as string) ?? ''}
                              onChange={(e) =>
                                update(`${q.id}-detail`, e.target.value)
                              }
                            />
                          </div>
                        ) : null}
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
                    {q.type === 'multi' && q.options && q.id === 'contexte' && (
                      (() => {
                        const arr = (draft[q.id] as string[]) ?? [];
                        return (
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setNewsOpen(true)}
                            >
                              <Newspaper size={14} /> Choisir actualité
                              {arr.length > 0 ? (
                                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                                  {arr.length}
                                </span>
                              ) : null}
                            </Button>
                            {arr.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {arr.map((o) => (
                                  <span
                                    key={o}
                                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800"
                                  >
                                    <span className="truncate">{o}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()
                    )}
                    {q.type === 'multi' && q.options && q.id === 'plats-carte' && (
                      (() => {
                        const arr = (draft[q.id] as string[]) ?? [];
                        return (
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDishesOpen(true)}
                            >
                              <Utensils size={14} /> Choisir un plat
                              {arr.length > 0 ? (
                                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                                  {arr.length}
                                </span>
                              ) : null}
                            </Button>
                            {arr.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {arr.map((o) => (
                                  <span
                                    key={o}
                                    className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800"
                                  >
                                    <span className="truncate">{o}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()
                    )}
                    {q.type === 'multi' && q.options && q.id !== 'contexte' && q.id !== 'plats-carte' && (
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
                  {strategyResult.media && strategyResult.media.length > 0 ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] normal-case font-medium text-violet-700">
                      <Sparkles size={10} /> {strategyResult.media.length} visuel
                      {strategyResult.media.length > 1 ? 's' : ''} IA
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {strategyResult.posts.map((p) => {
                    const visual = p.mediaId
                      ? strategyResult.media?.find((m) => m.id === p.mediaId)
                      : null;
                    return (
                      <div
                        key={p.id}
                        className="flex gap-2.5 rounded-lg border border-ink-100 p-2.5 text-sm"
                      >
                        {visual ? (
                          <div
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-ink-100 bg-ink-50"
                            style={{ backgroundImage: `url(${visual.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
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
                      </div>
                    );
                  })}
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

      {/* POPUP — Choisir actualité (rattaché à la question "contexte" du questionnaire) */}
      <Modal
        open={newsOpen}
        onClose={() => setNewsOpen(false)}
        title="Choisir les actualités à aborder"
        size="lg"
      >
        {(() => {
          const contextQuestion = effectiveQuestions.find((q) => q.id === 'contexte');
          const options = contextQuestion?.options ?? [];
          const selected = (draft['contexte'] as string[]) ?? [];

          if (options.length === 0) {
            return (
              <p className="text-sm text-ink-500">
                Aucune actualité disponible. Lancez ou actualisez la veille pour alimenter cette liste.
              </p>
            );
          }

          // Reconstitue catégorie + titre + date à partir du watch quand possible,
          // sinon parse "YYYY-MM-DD — label" en fallback.
          const categorize = (
            opt: string
          ): { category: string; title: string; date: string } => {
            if (watch) {
              const buckets: Array<{ cat: string; items: { date: string; label: string }[] }> = [
                { cat: 'Journée internationale', items: watch.worldDays ?? [] },
                { cat: 'Événement local', items: watch.localEvents ?? [] },
                { cat: 'Sport & culture', items: watch.sportsCulture ?? [] },
                { cat: 'Fête commerciale / férié', items: watch.commercialEvents ?? [] },
              ];
              for (const b of buckets) {
                const hit = b.items.find((it) => {
                  const datePrefix = it.date ? `${it.date} — ` : '';
                  return `${datePrefix}${it.label}` === opt;
                });
                if (hit) return { category: b.cat, title: hit.label, date: hit.date };
              }
            }
            const idx = opt.indexOf(' — ');
            if (idx > 0) {
              return { category: 'Actualité', title: opt.slice(idx + 3), date: opt.slice(0, idx) };
            }
            return { category: 'Actualité', title: opt, date: '' };
          };

          const cards = options.map((opt) => ({ value: opt, ...categorize(opt) }));

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{selected.length} sélectionnée{selected.length > 1 ? 's' : ''} sur {options.length}</span>
                {selected.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => update('contexte', [])}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Tout désélectionner
                  </button>
                ) : null}
              </div>
              <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {cards.map((c) => {
                  const checked = selected.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() =>
                        update(
                          'contexte',
                          checked
                            ? selected.filter((x) => x !== c.value)
                            : [...selected, c.value]
                        )
                      }
                      className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left shadow-sm transition ${
                        checked
                          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200'
                          : 'border-ink-100 bg-white hover:border-brand-300 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                          <Newspaper size={11} /> {c.category}
                        </span>
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-full border ${
                            checked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-ink-300 bg-white'
                          }`}
                        >
                          {checked ? <CheckCircle2 size={12} /> : null}
                        </span>
                      </div>
                      <div className="text-sm font-medium leading-snug text-ink-900">
                        {c.title}
                      </div>
                      {c.date ? (
                        <div className="mt-auto flex items-center gap-1 text-xs text-ink-500">
                          <CalendarDays size={12} /> {formatDateFr(c.date)}
                        </div>
                      ) : (
                        <div className="mt-auto text-xs italic text-ink-400">Sans date précise</div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={() => setNewsOpen(false)}>Valider</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* POPUP — Choisir un plat (alimenté par la carte permanente de l'établissement) */}
      <Modal
        open={dishesOpen}
        onClose={() => setDishesOpen(false)}
        title="Choisir un plat à mettre en avant"
        size="lg"
      >
        {(() => {
          const dishesQuestion = effectiveQuestions.find((q) => q.id === 'plats-carte');
          const options = dishesQuestion?.options ?? [];
          const selected = (draft['plats-carte'] as string[]) ?? [];

          if (options.length === 0) {
            return (
              <p className="text-sm text-ink-500">
                Aucun plat enregistré. Renseignez la carte permanente depuis la fiche
                Établissement, puis relancez la veille pour rafraîchir le questionnaire.
              </p>
            );
          }

          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{selected.length} sélectionné{selected.length > 1 ? 's' : ''} sur {options.length}</span>
                {selected.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => update('plats-carte', [])}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Tout désélectionner
                  </button>
                ) : null}
              </div>
              <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {options.map((dish) => {
                  const checked = selected.includes(dish);
                  return (
                    <button
                      key={dish}
                      type="button"
                      onClick={() =>
                        update(
                          'plats-carte',
                          checked
                            ? selected.filter((x) => x !== dish)
                            : [...selected, dish]
                        )
                      }
                      className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left shadow-sm transition ${
                        checked
                          ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200'
                          : 'border-ink-100 bg-white hover:border-brand-300 hover:shadow'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                          <Utensils size={11} /> Plat de la carte
                        </span>
                        <span
                          className={`grid h-4 w-4 place-items-center rounded-full border ${
                            checked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-ink-300 bg-white'
                          }`}
                        >
                          {checked ? <CheckCircle2 size={12} /> : null}
                        </span>
                      </div>
                      <div className="text-sm font-medium leading-snug text-ink-900">
                        {dish}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end pt-1">
                <Button onClick={() => setDishesOpen(false)}>Valider</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
