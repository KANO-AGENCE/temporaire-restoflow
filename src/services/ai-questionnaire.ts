import { getOpenAI, TEXT_MODEL } from '@/lib/openai/client';
import type { Establishment, Questionnaire, WatchContext } from '@/types';
import { uid, nowIso } from '@/lib/utils';

function buildContextOptions(watch?: WatchContext): string[] {
  if (!watch) return [];
  const items: { date: string; label: string }[] = [
    ...(watch.localEvents ?? []),
    ...(watch.sportsCulture ?? []),
    ...(watch.worldDays ?? []),
    ...(watch.commercialEvents ?? []),
  ];
  const unique = new Map<string, string>();
  for (const it of items) {
    if (!it?.label) continue;
    const key = `${it.date}|${it.label}`;
    if (!unique.has(key)) {
      const datePrefix = it.date ? `${it.date} — ` : '';
      unique.set(key, `${datePrefix}${it.label}`);
    }
  }
  return Array.from(unique.values()).slice(0, 14);
}

function baseQuestions(establishment: Establishment, watch?: WatchContext): Questionnaire {
  const contextOptions = buildContextOptions(watch);
  const questions = [];

  if (contextOptions.length > 0) {
    questions.push({
      id: 'contexte',
      question: 'Éléments contextuels à intégrer dans la com de cette semaine ?',
      type: 'multi' as const,
      options: contextOptions,
      helper:
        'Issu de la veille. Coche uniquement ce que tu veux exploiter — laisse le reste de côté.',
    });
  }

  questions.push(
    {
      id: 'plat',
      question: 'Y a-t-il un plat à mettre en avant cette semaine ?',
      type: 'textarea' as const,
      helper: establishment.specialties
        ? `Spécialités connues: ${establishment.specialties}`
        : undefined,
    },
    {
      id: 'offre',
      question: 'Une offre spéciale, un menu ou un prix à pousser ?',
      type: 'textarea' as const,
    },
    {
      id: 'evenement-interne',
      question: 'Un événement interne à annoncer (JaykeBox, soirée, arrivage exceptionnel) ?',
      type: 'textarea' as const,
      helper: establishment.recurringEvents
        ? `Événements récurrents connus: ${establishment.recurringEvents}`
        : undefined,
    },
    {
      id: 'reservation',
      question: 'Faut-il pousser la réservation cette semaine ?',
      type: 'boolean' as const,
    },
    {
      id: 'photos',
      question: 'Avez-vous des photos organiques à utiliser ?',
      type: 'boolean' as const,
    },
    {
      id: 'angles',
      question: 'Angles éditoriaux à aborder ?',
      type: 'multi' as const,
      options: ['Équipe', 'Coulisses', 'Produit', 'Recette', 'Producteur', 'Salle / ambiance'],
    },
    {
      id: 'contrainte',
      question: 'Une contrainte particulière (fermeture exceptionnelle, allergène, message à passer) ?',
      type: 'textarea' as const,
    },
    {
      id: 'plateformes',
      question: 'Sur quelles plateformes communiquer ?',
      type: 'multi' as const,
      options: ['Facebook', 'Instagram', 'LinkedIn', 'Google'],
    }
  );

  return {
    id: uid('quiz'),
    establishmentId: establishment.id,
    watchContextId: watch?.id,
    generatedAt: nowIso(),
    questions,
  };
}

export async function generateQuestionnaire(
  establishment: Establishment,
  watch?: WatchContext
): Promise<Questionnaire> {
  const openai = getOpenAI();
  const fallback = baseQuestions(establishment, watch);
  if (!openai) return fallback;

  // La question "contexte" est toujours produite localement à partir du watch
  // (pas de hallucination possible), puis on demande à l'IA d'ajouter 5-7 questions
  // d'affinage tactique. On ne laisse jamais l'IA générer la liste contextuelle.
  const contextQuestion = fallback.questions.find((q) => q.id === 'contexte');

  try {
    const prompt = `Génère 5 à 7 questions d'AFFINAGE TACTIQUE pour préparer la semaine de com d'un restaurant.
But: une fois la veille faite et les éléments contextuels choisis par l'utilisateur, on lui pose les bonnes questions pour préciser sa stratégie (plat à pousser, offre, événement interne, réservation, photos, angles, contraintes, plateformes).

Restaurant: ${JSON.stringify({
      name: establishment.name,
      city: establishment.city,
      cuisineType: establishment.cuisineType,
      positioning: establishment.positioning,
      tone: establishment.tone,
      specialties: establishment.specialties,
      recurringEvents: establishment.recurringEvents,
    })}
${watch?.summary ? `Synthèse veille (à titre indicatif uniquement, n'invente pas d'autres événements): ${watch.summary}` : ''}

Règles:
- Pas de question sur les "événements à intégrer" — c'est déjà couvert par la question contexte gérée à part.
- Questions courtes, actionnables, en français.
- Types autorisés: text, textarea, boolean, choice, multi.
- Une question "plateformes" en multi avec ["Facebook","Instagram","LinkedIn","Google"] obligatoire en dernier.

Réponds en JSON: {"questions":[{"id":"slug","question":"...","type":"text|textarea|choice|multi|boolean","options":[...],"helper":"..."}]}`;
    const res = await openai.chat.completions.create({
      model: TEXT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu réponds en JSON valide, en français, sans commentaire.' },
        { role: 'user', content: prompt },
      ],
    });
    const json = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (!Array.isArray(json.questions) || json.questions.length === 0) return fallback;
    const aiQuestions = json.questions.filter(
      (q: { id?: string }) => q?.id !== 'contexte'
    );
    return {
      ...fallback,
      questions: contextQuestion ? [contextQuestion, ...aiQuestions] : aiQuestions,
    };
  } catch {
    return fallback;
  }
}
