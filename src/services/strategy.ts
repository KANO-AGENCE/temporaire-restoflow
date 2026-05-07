import { getOpenAI, TEXT_MODEL } from '@/lib/openai/client';
import type {
  Establishment,
  MediaFile,
  Platform,
  Post,
  PostObjective,
  Questionnaire,
  Tone,
  WatchContext,
} from '@/types';
import { generateWatchContext } from './ai-watch';
import { generateQuestionnaire } from './ai-questionnaire';
import { generatePost } from './ai-post';
import { generateImage, pickImageSize } from './ai-image';
import { uid, nowIso } from '@/lib/utils';

export interface StrategicContext {
  establishment: Establishment;
  watch: WatchContext;
  questionnaire: Questionnaire;
}

export async function buildStrategicContext(
  establishment: Establishment
): Promise<StrategicContext> {
  const watch = await generateWatchContext(establishment);
  const questionnaire = await generateQuestionnaire(establishment, watch);
  return { establishment, watch, questionnaire };
}

interface AnswerMap {
  [questionId: string]: string | string[] | boolean;
}

interface StrategyPlanItem {
  date: string;
  time?: string;
  objective: PostObjective;
  platforms: Platform[];
  briefing: string;
  hookAngle?: string;
}

interface StrategyPlan {
  summary: string;
  items: StrategyPlanItem[];
}

const PLATFORM_MAP: Record<string, Platform> = {
  Facebook: 'facebook',
  Instagram: 'instagram',
  LinkedIn: 'linkedin',
  Google: 'google',
};

function normalizeObjective(raw: string): PostObjective {
  const v = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  if (v.startsWith('reserv')) return 'reservation';
  if (v.startsWith('event') || v.startsWith('evenement')) return 'evenement';
  if (v.startsWith('offre') || v.includes('special')) return 'offre-speciale';
  if (v.startsWith('fidel')) return 'fidelisation';
  if (v.startsWith('recrut')) return 'recrutement';
  if (v.startsWith('coul')) return 'coulisses';
  return 'notoriete';
}

const TONE_MAP: Record<string, Tone> = {
  Premium: 'premium',
  Familial: 'familial',
  Fun: 'fun',
  Local: 'local',
  Élégant: 'elegant',
  Accessible: 'accessible',
};

function platformsFromAnswers(answers: AnswerMap, fallback: Platform[]): Platform[] {
  const raw = answers['plateformes'];
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((p) => PLATFORM_MAP[String(p)]).filter(Boolean) as Platform[];
  }
  return fallback;
}

function toneFromAnswers(answers: AnswerMap, fallback?: Tone): Tone | undefined {
  const raw = answers['ton'];
  if (typeof raw === 'string' && TONE_MAP[raw]) return TONE_MAP[raw];
  return fallback;
}

function answerString(answers: AnswerMap, key: string): string {
  const v = answers[key];
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  return typeof v === 'string' ? v.trim() : '';
}

function buildMockPlan(
  establishment: Establishment,
  watch: WatchContext,
  answers: AnswerMap,
  startDate: Date,
  platforms: Platform[]
): StrategyPlan {
  const dish = answerString(answers, 'plat');
  const offerYes = answers['offre'] === true || /oui/i.test(answerString(answers, 'offre'));
  const offerDetail = answerString(answers, 'offre-detail');
  const event = answerString(answers, 'evenement');
  const angles = answerString(answers, 'angles');
  const reservation = answers['reservation'] === true || /oui/i.test(answerString(answers, 'reservation'));
  const reservationDetail = answerString(answers, 'reservation-detail');

  const day = (n: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const items: StrategyPlanItem[] = [];
  if (dish) {
    items.push({
      date: day(0),
      time: '12:00',
      objective: 'notoriete',
      platforms,
      briefing: `Mettre en avant ${dish} — ancrer dans la saison (${watch.seasonality}) et le local (${watch.city}).`,
      hookAngle: 'plat phare de la semaine',
    });
  }
  if (reservation) {
    items.push({
      date: day(1),
      time: '11:30',
      objective: 'reservation',
      platforms,
      briefing: `Pousser la réservation${reservationDetail ? ` — angle demandé: ${reservationDetail}` : ' — rappeler les horaires et faciliter la prise de contact'}. Spécialités: ${establishment.specialties ?? '—'}.`,
      hookAngle: 'urgence douce',
    });
  }
  if (offerYes) {
    items.push({
      date: day(2),
      time: '18:30',
      objective: 'offre-speciale',
      platforms,
      briefing: offerDetail
        ? `Communiquer la promotion: ${offerDetail}. Préciser conditions et durée.`
        : `Communiquer la promotion en cours (à préciser par le restaurateur). Préciser conditions et durée.`,
    });
  }
  if (angles) {
    items.push({
      date: day(3),
      time: '09:30',
      objective: 'coulisses',
      platforms,
      briefing: `Angle ${angles} — humaniser la marque. Éviter le ton corporate.`,
    });
  }
  if (event) {
    items.push({
      date: day(4),
      time: '17:00',
      objective: 'evenement',
      platforms,
      briefing: `Annoncer: ${event}. Rappeler l'invitation et le moyen de réserver.`,
    });
  }

  if (items.length < 3) {
    const fillers: Array<{ obj: PostObjective; brief: string }> = [
      { obj: 'fidelisation', brief: `Tendance: ${watch.nationalTrends[0] ?? 'cuisine locavore'}. Inviter les habitués à revenir.` },
      { obj: 'notoriete', brief: `${watch.worldDays[0]?.label ? `Capitaliser sur ${watch.worldDays[0].label}.` : 'Mettre en avant le quartier.'}` },
      { obj: 'coulisses', brief: 'Coulisses cuisine — montrer un geste, un produit, un fournisseur.' },
    ];
    let i = 0;
    while (items.length < 5 && i < fillers.length) {
      items.push({
        date: day(items.length),
        time: items.length % 2 === 0 ? '12:00' : '18:30',
        objective: fillers[i].obj,
        platforms,
        briefing: fillers[i].brief,
      });
      i++;
    }
  }

  const summary = `Stratégie ${establishment.name} (${establishment.city}) basée sur la veille (${watch.seasonality}) et vos réponses. ${items.length} contenus prévus, axés ${reservation ? 'réservation' : 'notoriété'}, ton ${toneFromAnswers(answers, establishment.tone) ?? 'accessible'}.`;

  return { summary, items: items.slice(0, 5) };
}

async function buildPlan(
  establishment: Establishment,
  watch: WatchContext,
  answers: AnswerMap,
  startDate: Date,
  platforms: Platform[],
  tone?: Tone
): Promise<StrategyPlan> {
  const fallback = buildMockPlan(establishment, watch, answers, startDate, platforms);
  const openai = getOpenAI();
  if (!openai) return fallback;

  const signaturePlatforms = establishment.signaturePlatforms ?? platforms;
  const requireAllPlatforms = signaturePlatforms.length >= 3;

  try {
    const restaurantBlock = JSON.stringify({
      name: establishment.name,
      city: establishment.city,
      address: establishment.address,
      cuisineType: establishment.cuisineType,
      positioning: establishment.positioning,
      tone: tone ?? establishment.tone,
      specialties: establishment.specialties,
      recurringOffers: establishment.recurringOffers,
      recurringEvents: establishment.recurringEvents,
    });
    const playbook = establishment.brandGuidelines
      ? `\nPLAYBOOK ÉDITORIAL DE L'ÉTABLISSEMENT — RESPECTE-LE STRICTEMENT:\n${establishment.brandGuidelines}\n`
      : '';
    const platformDirective = requireAllPlatforms
      ? `\nCOUVERTURE MULTI-SUPPORT IMPOSÉE — la stratégie hebdo couvre obligatoirement: ${signaturePlatforms.join(', ')}.
Répartition typique:
- 3 à 5 publications Instagram + Facebook (groupées sur les mêmes posts)
- 1 à 2 publications LinkedIn (storytelling, savoir-faire, repas pro)
- 1 à 2 publications Google Business (carte/ardoise, événement, offre, infos pratiques)
La semaine doit donc contenir au minimum 1 post LinkedIn et 1 post Google Business distincts des posts IG/FB.`
      : `\nPlateformes prioritaires: ${platforms.join(', ')}.`;

    const selectedContext = Array.isArray(answers['contexte'])
      ? (answers['contexte'] as string[])
      : [];
    const contextDirective = selectedContext.length
      ? `Éléments contextuels SÉLECTIONNÉS par le gérant (à exploiter, pas les autres):
${selectedContext.map((s) => `- ${s}`).join('\n')}`
      : `Aucun élément contextuel sélectionné — base-toi uniquement sur les réponses tactiques.`;

    const selectedDishes = Array.isArray(answers['plats-carte'])
      ? (answers['plats-carte'] as string[])
      : [];
    const freeDish = answerString(answers, 'plat');
    const dishDirective =
      selectedDishes.length || freeDish
        ? `PLATS À METTRE EN AVANT — UNIQUEMENT ceux-ci, dans cet ordre de priorité:
${selectedDishes.map((d) => `- (carte) ${d}`).join('\n')}${selectedDishes.length && freeDish ? '\n' : ''}${freeDish ? `- (autres / précisions) ${freeDish}` : ''}`
        : `Aucun plat spécifique demandé — laisse la cuisine au second plan ou exploite seulement les spécialités déclarées dans la fiche établissement.`;

    const offerYes = answers['offre'] === true || /oui/i.test(answerString(answers, 'offre'));
    const offerDetail = answerString(answers, 'offre-detail');
    const offerDirective = offerYes
      ? offerDetail
        ? `PROMOTION À POUSSER cette semaine: ${offerDetail}. Prévoir au moins 1 publication "offre-speciale" qui la communique avec conditions claires.`
        : `Promotion active mais non détaillée par le gérant — prévois 1 publication "offre-speciale" générique appuyée sur les offres récurrentes (${establishment.recurringOffers ?? 'à définir'}).`
      : `Pas de promotion à pousser cette semaine — n'invente AUCUN prix, aucune réduction, aucune formule.`;

    const briefing = `Tu es directeur·rice de communication pour le restaurant ci-dessous. Construis un plan éditorial cohérent de 5 à 7 publications pour la semaine, à partir UNIQUEMENT des réponses du gérant et des éléments qu'il a explicitement sélectionnés.

Établissement: ${restaurantBlock}
${playbook}
Saisonnalité (info de fond, à mobiliser quand pertinent): ${watch.seasonality}

${contextDirective}

${dishDirective}

${offerDirective}

Réponses tactiques du gérant: ${JSON.stringify(answers)}
${platformDirective}
Date de départ: ${startDate.toISOString().slice(0, 10)}

Règles strictes:
- N'invente AUCUN événement / journée / actu qui n'est pas dans la sélection de l'utilisateur. Ce qui n'est pas coché n'existe pas pour ce plan.
- 5 à 7 publications réparties sur la semaine (lundi à dimanche à partir de la date de départ).
- Chaque publication a un objectif distinct quand possible (notoriete, reservation, fidelisation, evenement, offre-speciale, recrutement, coulisses).
- Cohérence éditoriale: les publications forment un fil conducteur.
- Anticipation événements: si un événement coché ou un événement interne déclaré est à venir, prévoir 2-3 touches d'anticipation (annonce + relance).
- Respecte la hiérarchie d'angles du playbook s'il est fourni.

Réponds en JSON: {"summary":"...","items":[{"date":"YYYY-MM-DD","time":"HH:mm","objective":"notoriete|reservation|fidelisation|evenement|offre-speciale|recrutement|coulisses","platforms":["instagram","facebook"|"linkedin"|"google"],"briefing":"...","hookAngle":"..."}]}`;

    const res = await openai.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu réponds en JSON valide en français, sans markdown.' },
        { role: 'user', content: briefing },
      ],
    });
    const json = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (!json.items || !Array.isArray(json.items) || json.items.length === 0) return fallback;
    return {
      summary: json.summary ?? fallback.summary,
      items: json.items.slice(0, 7).map((i: StrategyPlanItem) => ({
        ...i,
        objective: normalizeObjective(String(i.objective ?? 'notoriete')),
        platforms: (Array.isArray(i.platforms) ? i.platforms : platforms)
          .map((p) => String(p).toLowerCase())
          .filter((p) => ['facebook', 'instagram', 'linkedin', 'google'].includes(p)) as Platform[],
      })),
    };
  } catch {
    return fallback;
  }
}

export interface FullStrategyResult {
  summary: string;
  posts: Post[];
  /** Images IA générées en accompagnement des posts (linkées via post.mediaId). */
  media: MediaFile[];
}

export async function generateFullStrategy(params: {
  establishment: Establishment;
  watch: WatchContext;
  answers: AnswerMap;
  startDate?: Date;
  defaultPlatforms?: Platform[];
  /** Désactive la génération d'images (mode dégradé / debug). Default: false. */
  skipImages?: boolean;
}): Promise<FullStrategyResult> {
  if (!params.answers || Object.keys(params.answers).length === 0) {
    throw new Error('Réponses du questionnaire requises avant toute génération.');
  }

  const startDate = params.startDate ?? new Date();
  const fallbackPlatforms =
    params.establishment.signaturePlatforms && params.establishment.signaturePlatforms.length
      ? params.establishment.signaturePlatforms
      : params.defaultPlatforms ?? ['instagram', 'facebook'];
  const platforms = platformsFromAnswers(params.answers, fallbackPlatforms);
  const tone = toneFromAnswers(params.answers, params.establishment.tone);

  const plan = await buildPlan(
    params.establishment,
    params.watch,
    params.answers,
    startDate,
    platforms,
    tone
  );

  const posts: Post[] = [];
  for (const item of plan.items) {
    const post = await generatePost({
      establishment: params.establishment,
      platforms: item.platforms.length > 0 ? item.platforms : platforms,
      objective: item.objective,
      format: 'post',
      tone,
      briefing: item.briefing,
      date: item.date,
      time: item.time,
    });
    posts.push({
      ...post,
      id: uid('post'),
      status: 'a-valider',
      createdAt: nowIso(),
    });
  }

  // Génération des visuels en PARALLÈLE pour ne pas exploser le temps total.
  // Chaque image est dimensionnée selon les plateformes du post (carré IG/FB,
  // paysage si LinkedIn / Google seuls).
  const media: MediaFile[] = [];
  if (!params.skipImages) {
    const tasks = posts.map(async (post) => {
      const size = pickImageSize(post.platforms);
      const promptText =
        post.imagePrompt?.trim() ||
        `${post.visualIdea ?? 'plat phare'} — restaurant ${
          params.establishment.cuisineType ?? ''
        } à ${params.establishment.city}, photographie éditoriale food, lumière naturelle, qualité haute`;
      const result = await generateImage(promptText, { size, quality: 'medium' });
      const m: MediaFile = {
        id: uid('med'),
        establishmentId: params.establishment.id,
        url: result.url,
        source: 'ai',
        prompt: result.prompt,
        uploadedAt: nowIso(),
        alt: post.visualIdea,
      };
      return { postId: post.id, media: m };
    });
    const settled = await Promise.allSettled(tasks);
    for (const s of settled) {
      if (s.status !== 'fulfilled') {
        console.warn('[strategy] image generation rejected:', s.reason);
        continue;
      }
      media.push(s.value.media);
      const target = posts.find((p) => p.id === s.value.postId);
      if (target) target.mediaId = s.value.media.id;
    }
  }

  return { summary: plan.summary, posts, media };
}
