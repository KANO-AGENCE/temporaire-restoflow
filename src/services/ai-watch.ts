import { getOpenAI } from '@/lib/openai/client';
import type { Establishment, WatchContext } from '@/types';
import { uid, nowIso } from '@/lib/utils';

// Modèle utilisé pour la veille live (supporte le tool web_search_preview).
// Volontairement séparé de TEXT_MODEL pour ne pas peser sur la génération de posts.
const WATCH_MODEL = process.env.OPENAI_WATCH_MODEL || 'gpt-4o';

const SEASONS_BY_MONTH = [
  'Hiver — plats réconfortants, fondues, soupes',
  'Hiver — chocolat chaud, gibier, agrumes',
  'Début de printemps — légumes nouveaux, asperges',
  'Printemps — herbes fraîches, terrasse',
  'Printemps — fraises, lever de saison terrasse',
  'Été — produits frais, glaces, apéro',
  'Été — barbecue, tomates, melon, terrasses pleines',
  'Été — fin de saison, retour de vacances',
  'Rentrée — comfort food, champignons',
  'Automne — courges, cèpes, vendanges',
  'Automne — gibier, châtaignes',
  'Hiver — fêtes, foie gras, chapon, huîtres',
];

const NATIONAL_TRENDS = [
  'Cuisine locavore et circuits courts',
  'Menus végétariens travaillés',
  'Plats du marché du jour',
  'Mocktails et alcools faibles',
  'Fermentations et pickles maison',
  'Pain au levain et fournil interne',
  'Storytelling producteur visible en salle',
];

const WORLD_DAYS_BY_MONTH: Record<number, { date: string; label: string }[]> = {
  1: [{ date: '01-06', label: 'Épiphanie' }],
  2: [{ date: '02-02', label: 'Chandeleur' }, { date: '02-14', label: 'Saint-Valentin' }],
  3: [{ date: '03-20', label: 'Journée de la francophonie' }],
  4: [{ date: '04-22', label: 'Jour de la Terre' }],
  5: [{ date: '05-01', label: 'Fête du travail' }, { date: '05-08', label: 'Victoire 1945' }],
  6: [{ date: '06-21', label: 'Fête de la musique' }],
  7: [{ date: '07-14', label: 'Fête nationale' }],
  8: [{ date: '08-15', label: 'Assomption' }],
  9: [{ date: '09-21', label: 'Journée de la paix' }],
  10: [{ date: '10-16', label: 'Journée mondiale de l\'alimentation' }, { date: '10-31', label: 'Halloween' }],
  11: [{ date: '11-01', label: 'Toussaint' }, { date: '11-21', label: 'Beaujolais nouveau' }],
  12: [{ date: '12-24', label: 'Réveillon de Noël' }, { date: '12-31', label: 'Réveillon Saint-Sylvestre' }],
};

function buildMockWatch(establishment: Establishment): WatchContext {
  const now = new Date();
  const month = now.getMonth();
  const seasonality = SEASONS_BY_MONTH[month];
  const worldDays = WORLD_DAYS_BY_MONTH[month + 1] ?? [];
  const city = establishment.city || 'votre ville';

  return {
    id: uid('watch'),
    establishmentId: establishment.id,
    generatedAt: nowIso(),
    city,
    nationalTrends: NATIONAL_TRENDS.slice(0, 5),
    worldDays,
    localEvents: [
      { date: '', label: `Marché central de ${city} le samedi` },
      { date: '', label: `Animations centre-ville de ${city} ce week-end` },
    ],
    seasonality,
    weather: 'Données météo non connectées (mock)',
    schoolHolidays: 'À récupérer via API officielle',
    commercialEvents: [
      { date: '', label: 'Black Friday (novembre)' },
      { date: '', label: 'Soldes d\'hiver (janvier)' },
    ],
    sportsCulture: [
      { date: '', label: 'Match du club local' },
      { date: '', label: 'Festival régional saisonnier' },
    ],
    summary: `Contexte ${city} — saison: ${seasonality}. Pousser le local, jouer sur la fraîcheur, s'aligner sur ${worldDays.map((w) => w.label).join(', ') || 'les rendez-vous calendaires du moment'}.`,
  };
}

function ensureStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
  if (typeof v === 'string') {
    return v
      .split(/\n|;|,(?=\s)/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function ensureDayArray(v: unknown): { date: string; label: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (typeof item === 'string') return { date: '', label: item };
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return {
          date: typeof obj.date === 'string' ? obj.date : '',
          label: typeof obj.label === 'string' ? obj.label : String(obj.name ?? ''),
        };
      }
      return null;
    })
    .filter((x): x is { date: string; label: string } => !!x && x.label.length > 0);
}

function extractJson(text: string): Record<string, unknown> {
  if (!text) return {};
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;

  // Tente d'abord parse direct
  try {
    return JSON.parse(candidate.trim());
  } catch {
    /* fallthrough */
  }

  // Sinon: scan brace-balance pour isoler le premier objet JSON complet
  const start = candidate.indexOf('{');
  if (start === -1) return {};
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const c = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\') {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return {};
        }
      }
    }
  }
  return {};
}

export async function generateWatchContext(establishment: Establishment): Promise<WatchContext> {
  const openai = getOpenAI();
  if (!openai) return buildMockWatch(establishment);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const department = 'Maine-et-Loire';

  const userPrompt = `Date du jour: ${todayIso}.
Établissement (pour cibler la zone géographique uniquement):
${JSON.stringify({
    name: establishment.name,
    city: establishment.city,
    department,
  }, null, 2)}

Mission: COLLECTE DE DONNÉES BRUTES pour ${establishment.city} (${department}) et le secteur gastronomie/restauration. Tu fais 1 à 2 recherches web ciblées maximum (contrainte budgétaire stricte).

Tu rapportes FIDÈLEMENT ce que tu trouves — pas d'interprétation, pas de recommandation, pas de stratégie de communication. C'est l'utilisateur qui décidera ensuite ce qu'il garde via un questionnaire.

Cherche tous les éléments factuels suivants pour la semaine en cours + 2 semaines à venir:

1. Événements / festivals / animations à ${establishment.city} et en ${department}
2. Actualité sport local (matchs SCO Angers, championnats, finales, déplacements supporters)
3. Fêtes calendaires, ponts, fériés, vacances scolaires
4. Journées mondiales / nationales / thématiques (food et hors-food)
5. Saisonnalité produits — ce qui rentre / ce qui sort sur les étals et sur les marchés locaux (Marché du Ralliement, Halles d'Angers, etc.)
6. Actualités food / gastronomie nationales — ouvertures, distinctions, polémiques, tendances confirmées par la presse spécialisée

Renvoie un JSON unique (zéro markdown, zéro commentaire), en français, schéma EXACT:
{
  "localEvents": [{"date":"YYYY-MM-DD","label":"string factuel: nom + lieu + 1 info utile"}],
  "sportsCulture": [{"date":"YYYY-MM-DD","label":"string factuel: équipes + championnat / spectacle + lieu"}],
  "worldDays": [{"date":"YYYY-MM-DD","label":"string: nom de la journée"}],
  "commercialEvents": [{"date":"YYYY-MM-DD","label":"string: férié, pont, vacances, fête commerciale"}],
  "nationalTrends": ["string factuelle: actu food / gastronomie nationale, 1 ligne par item"],
  "seasonality": "string: liste des produits de saison du moment dans la région",
  "summary": "string: une simple énumération neutre — 'Voici les éléments trouvés cette semaine: …'. Pas de recommandation, pas de stratégie, pas de 'profitez de'."
}

Règles strictes:
- Tout événement a une date YYYY-MM-DD réelle (jamais vide ni inventée).
- Si une info n'est pas confirmée par la recherche web, OMETS-LA. Pas d'invention.
- Pas de verbe d'incitation ("profitez", "organisez", "mettez en avant"). Tu RAPPORTES, tu ne CONSEILLES pas.
- N'utilise jamais une chaîne là où un tableau est attendu.`;

  try {
    type ResponsesAPI = {
      create: (args: Record<string, unknown>) => Promise<{ output_text?: string }>;
    };
    const responses = (openai as unknown as { responses?: ResponsesAPI }).responses;
    if (!responses?.create) throw new Error('Responses API indisponible dans le SDK');

    const response = await responses.create({
      model: WATCH_MODEL,
      input: [
        {
          role: 'system',
          content:
            'Tu es agent de collecte de données. Tu fais 1 à 2 recherches web maximum (jamais plus, contrainte budgétaire stricte). Tu réponds UNIQUEMENT par un objet JSON brut, sans markdown, sans ```json, sans préface, sans annotations citations. Le premier caractère doit être { et le dernier }.',
        },
        { role: 'user', content: userPrompt },
      ],
      tools: [{ type: 'web_search_preview' }],
      max_output_tokens: 3000,
    });

    const rawText = response.output_text || '';
    const json = extractJson(rawText);
    const summary = typeof json.summary === 'string' ? json.summary.trim() : '';
    if (!summary) {
      console.warn('[ai-watch] no extractable JSON in response, raw length:', rawText.length);
      console.warn('[ai-watch] raw preview:', rawText.slice(0, 800));
      return buildMockWatch(establishment);
    }

    // L'IA a parlé → on lui fait confiance intégralement (un array vide signifie
    // "pas d'élément trouvé", on n'injecte JAMAIS de mock dans la veille live).
    return {
      id: uid('watch'),
      establishmentId: establishment.id,
      generatedAt: nowIso(),
      city: establishment.city,
      nationalTrends: ensureStringArray(json.nationalTrends),
      worldDays: ensureDayArray(json.worldDays),
      localEvents: ensureDayArray(json.localEvents),
      commercialEvents: ensureDayArray(json.commercialEvents),
      sportsCulture: ensureDayArray(json.sportsCulture),
      seasonality: typeof json.seasonality === 'string' ? json.seasonality : '',
      summary,
      weather: undefined,
      schoolHolidays: undefined,
    };
  } catch (err) {
    console.error('[ai-watch] Responses API error:', err);
    return buildMockWatch(establishment);
  }
}
