import { NextResponse } from 'next/server';
import { getOpenAI, TEXT_MODEL } from '@/lib/openai/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Extrait une liste de plats à partir d'un texte brut de carte / menu.
 * - Côté serveur: appel OpenAI si dispo, sinon fallback heuristique.
 * - Réponse: { dishes: string[] }
 */
export async function POST(req: Request) {
  let body: { text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const raw = (body.text ?? '').trim();
  if (!raw) {
    return NextResponse.json({ error: 'Texte vide' }, { status: 400 });
  }
  if (raw.length > 20_000) {
    return NextResponse.json({ error: 'Texte trop long (max 20 000 caractères)' }, { status: 400 });
  }

  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json({ dishes: heuristicDishes(raw), source: 'heuristic' });
  }

  try {
    const res = await openai.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Tu réponds en JSON valide, en français, sans commentaire ni markdown.',
        },
        {
          role: 'user',
          content: `Voici un texte brut de carte / menu de restaurant. Extrais UNIQUEMENT les noms de PLATS (entrées, plats, desserts).

RÈGLES STRICTES:
- 1 plat = 1 string. Pas de description, pas de prix, pas de quantité.
- Préserve les noms originaux (ne traduis pas, ne reformule pas, ne corrige pas).
- Exclus: boissons, vins, cafés, intitulés de section ("Entrées", "Desserts"…), formules ("Menu midi 18€"), suppléments, allergènes.
- Si une ligne ressemble à "Tartare de bœuf au couteau, frites maison — 24€", ne garde QUE "Tartare de bœuf au couteau".
- Si la ligne contient un verbe d'action ou une phrase commerciale ("Découvrez…", "À déguster…"), exclus-la.
- Maximum 60 plats. Si la carte est plus longue, garde les plus distinctifs.
- Déduplique.

Texte brut:
"""
${raw}
"""

Réponds en JSON: {"dishes":["...","..."]}`,
        },
      ],
    });
    const json = JSON.parse(res.choices[0]?.message?.content || '{}');
    const dishes = Array.isArray(json.dishes)
      ? (json.dishes as unknown[])
          .map((d) => String(d).trim())
          .filter((d) => d.length > 0 && d.length <= 120)
      : [];
    if (dishes.length === 0) {
      return NextResponse.json({ dishes: heuristicDishes(raw), source: 'heuristic-fallback' });
    }
    // Dédup case-insensitive
    const seen = new Set<string>();
    const dedup = dishes.filter((d) => {
      const k = d.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return NextResponse.json({ dishes: dedup.slice(0, 60), source: 'ai' });
  } catch (err) {
    console.error('[api/menu/extract] OpenAI error:', err);
    return NextResponse.json({ dishes: heuristicDishes(raw), source: 'heuristic-error' });
  }
}

/** Fallback bête: on coupe sur les retours de ligne et on filtre le bruit évident. */
function heuristicDishes(raw: string): string[] {
  const lines = raw
    .split(/\r?\n|·|•|—|–/g)
    .map((s) =>
      s
        .replace(/\d+[.,]?\d*\s*€/g, '') // retire les prix
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter(
      (s) =>
        s.length >= 3 &&
        s.length <= 120 &&
        !/^(entr[ée]es?|plats?|desserts?|menu|formule|boisson|vin|caf[ée])$/i.test(s)
    );
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const l of lines) {
    const k = l.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(l);
    if (dedup.length >= 60) break;
  }
  return dedup;
}
