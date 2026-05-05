import { getOpenAI, TEXT_MODEL } from '@/lib/openai/client';
import type {
  ContentFormat,
  Establishment,
  Platform,
  Post,
  PostObjective,
  PostVersion,
  Tone,
} from '@/types';
import { uid, nowIso } from '@/lib/utils';

interface PostInput {
  establishment: Establishment;
  platforms: Platform[];
  objective: PostObjective;
  format: ContentFormat;
  tone?: Tone;
  briefing?: string;
  date?: string;
  time?: string;
}

const PLATFORM_GUIDELINES: Record<Platform, string> = {
  instagram: 'Visuel fort, accroche en première ligne, ton engageant, 5 à 8 hashtags pertinents, max 2200 car.',
  facebook: 'Plus conversationnel, communautaire et local, 1 à 3 hashtags, lien vers réservation si pertinent.',
  linkedin: 'Angle pro: équipe, savoir-faire, recrutement, coulisses, ton sobre et inspirant, 3 hashtags max.',
  google: 'Très court (max 1500 car), clair, action immédiate (réserver, voir le menu), 0 hashtag.',
};

function pickHashtags(e: Establishment, platform: Platform): string[] {
  const bh = e.brandHashtags;
  if (!bh) {
    const local = [
      `#${e.city.toLowerCase().replace(/\s+/g, '')}`,
      `#restaurant${e.city.toLowerCase().replace(/\s+/g, '')}`,
      '#cuisinemaison',
    ];
    return local;
  }
  if (platform === 'linkedin') return (bh.linkedin ?? []).slice(0, 5);
  if (platform === 'google') return [];
  if (platform === 'facebook') return [...(bh.local ?? [])].slice(0, 3);
  return [
    ...(bh.core ?? []).slice(0, 3),
    ...(bh.local ?? []).slice(0, 3),
    ...(bh.product ?? []).slice(0, 3),
  ].slice(0, 10);
}

function pickCta(e: Establishment, platform: Platform, objective: PostObjective): string {
  const lib = e.ctaLibrary;
  if (!lib || lib.length === 0) {
    if (objective === 'reservation') return 'Réservez votre table';
    if (objective === 'evenement') return 'On vous attend';
    if (objective === 'offre-speciale') return 'Profitez-en cette semaine';
    return 'Venez découvrir';
  }
  if (platform === 'linkedin') return e.reservationUrl ? `Réservez sur ${e.reservationUrl} ou contactez-nous` : lib[0];
  if (platform === 'google') return e.reservationUrl ? 'Réservez directement depuis Google' : lib[0];
  if (platform === 'facebook') return 'Bouton Réserver sur notre page';
  return 'Réservez via le lien en bio';
}

function buildMockVersion(input: PostInput, platform: Platform): PostVersion {
  const e = input.establishment;
  const briefing = input.briefing?.trim() || `mise en avant ${input.objective}`;
  const cta = pickCta(e, platform, input.objective);
  const baseHashtags = pickHashtags(e, platform);

  switch (platform) {
    case 'instagram':
      return {
        platform,
        text: `${e.name} — ${briefing}. ${cta}.`,
        hashtags: baseHashtags,
        callToAction: cta,
      };
    case 'facebook':
      return {
        platform,
        text: `${e.name} — ${briefing}. ${cta}${e.phone ? ` ou au ${e.phone}` : ''}.`,
        hashtags: baseHashtags,
        callToAction: cta,
      };
    case 'linkedin':
      return {
        platform,
        text: `Chez ${e.name} (${e.city}), ${briefing}. Un savoir-faire que nous sommes fiers de partager.`,
        hashtags: baseHashtags,
        callToAction: cta,
      };
    case 'google':
    default:
      return {
        platform,
        text: `${briefing}. ${cta} chez ${e.name} à ${e.city}.`,
        hashtags: [],
        callToAction: cta,
      };
  }
}

function buildMockPost(input: PostInput): Post {
  const versions = input.platforms.map((p) => buildMockVersion(input, p));
  const date =
    input.date ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  const visualIdea = `Plan rapproché et lumière naturelle, ambiance ${input.tone ?? input.establishment.tone ?? 'chaleureuse'}, mise en valeur du produit phare`;
  return {
    id: uid('post'),
    establishmentId: input.establishment.id,
    date,
    time: input.time ?? '12:00',
    objective: input.objective,
    format: input.format,
    tone: input.tone ?? input.establishment.tone,
    platforms: input.platforms,
    versions,
    visualIdea,
    imagePrompt: `${visualIdea}, restaurant ${input.establishment.cuisineType ?? ''} ${input.establishment.city}, style éditorial food, qualité haute`,
    status: 'a-valider',
    createdAt: nowIso(),
  };
}

export async function generatePost(input: PostInput): Promise<Post> {
  const openai = getOpenAI();
  if (!openai) return buildMockPost(input);
  try {
    const e = input.establishment;
    const restaurantBlock = JSON.stringify({
      name: e.name,
      city: e.city,
      address: e.address,
      phone: e.phone,
      reservationUrl: e.reservationUrl,
      cuisineType: e.cuisineType,
      positioning: e.positioning,
      tone: input.tone ?? e.tone,
      specialties: e.specialties,
      recurringOffers: e.recurringOffers,
      recurringEvents: e.recurringEvents,
    });
    const hashtagBlock = e.brandHashtags
      ? `Banque de hashtags marque (à piocher selon la plateforme):
- core: ${(e.brandHashtags.core ?? []).join(' ')}
- local: ${(e.brandHashtags.local ?? []).join(' ')}
- product: ${(e.brandHashtags.product ?? []).join(' ')}
- linkedin: ${(e.brandHashtags.linkedin ?? []).join(' ')}`
      : '';
    const ctaBlock = e.ctaLibrary && e.ctaLibrary.length
      ? `CTA marque (varier d'un post à l'autre): ${e.ctaLibrary.join(' / ')}`
      : '';
    const playbook = e.brandGuidelines ? `\nPLAYBOOK ÉDITORIAL DE L'ÉTABLISSEMENT — RESPECTE-LE STRICTEMENT:\n${e.brandGuidelines}\n` : '';

    const prompt = `Tu es directeur·rice de communication restaurant. Génère un post adapté pour chaque plateforme demandée. Reprends fidèlement le briefing et adapte le style à chaque plateforme.

Restaurant: ${restaurantBlock}
${playbook}
${hashtagBlock}
${ctaBlock}

Objectif: ${input.objective}
Format: ${input.format}
Briefing: ${input.briefing ?? 'aucun briefing supplémentaire'}
Plateformes: ${input.platforms.join(', ')}

Règles plateforme (et longueurs):
${input.platforms.map((p) => `- ${p}: ${PLATFORM_GUIDELINES[p]}`).join('\n')}

Contraintes critiques:
- Respecte STRICTEMENT le playbook ci-dessus s'il est fourni (ton, hiérarchie d'angles, interdits, CTA, anticipation événements).
- Pour la viande, NOMME la race (jamais "côte de bœuf" tout court si l'établissement gère des races).
- Pas de superlatifs creux, pas de "expérience culinaire", pas de "voyage gustatif".
- Hashtags: pioche dans la banque marque si fournie, complète localement.

Réponds en JSON {"versions":[{"platform":"...","text":"...","hashtags":["..."],"callToAction":"..."}],"visualIdea":"...","imagePrompt":"..."}`;

    const res = await openai.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'JSON valide en français, sans markdown ni commentaire.' },
        { role: 'user', content: prompt },
      ],
    });
    const json = JSON.parse(res.choices[0]?.message?.content || '{}');
    const fallback = buildMockPost(input);
    if (!json.versions) return fallback;
    return {
      ...fallback,
      versions: json.versions,
      visualIdea: json.visualIdea ?? fallback.visualIdea,
      imagePrompt: json.imagePrompt ?? fallback.imagePrompt,
    };
  } catch {
    return buildMockPost(input);
  }
}

export async function generateWeeklyCalendar(
  establishment: Establishment,
  startDate: Date,
  options?: { tone?: Tone; platforms?: Platform[]; briefing?: string }
): Promise<Post[]> {
  const platforms = options?.platforms ?? ['instagram', 'facebook'];
  const objectives: PostObjective[] = [
    'notoriete',
    'reservation',
    'coulisses',
    'offre-speciale',
    'fidelisation',
  ];
  const posts: Post[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const post = await generatePost({
      establishment,
      platforms,
      objective: objectives[i % objectives.length],
      format: 'post',
      tone: options?.tone,
      briefing: options?.briefing,
      date: d.toISOString().slice(0, 10),
      time: i % 2 === 0 ? '12:00' : '18:30',
    });
    posts.push(post);
  }
  return posts;
}
