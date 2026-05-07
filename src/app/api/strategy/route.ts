import { NextResponse } from 'next/server';
import { buildStrategicContext, generateFullStrategy } from '@/services/strategy';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = await req.json();
  const action = body?.action;
  if (!body?.establishment) {
    return NextResponse.json({ error: 'Missing establishment' }, { status: 400 });
  }

  if (action === 'context') {
    const ctx = await buildStrategicContext(body.establishment);
    return NextResponse.json(ctx);
  }

  if (action === 'generate') {
    if (!body.watch || !body.answers) {
      return NextResponse.json(
        { error: 'Veille et réponses du questionnaire requises.' },
        { status: 400 }
      );
    }
    try {
      const result = await generateFullStrategy({
        establishment: body.establishment,
        watch: body.watch,
        answers: body.answers,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        defaultPlatforms: body.defaultPlatforms,
        skipImages: body.skipImages === true,
      });
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
