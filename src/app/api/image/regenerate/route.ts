import { NextResponse } from 'next/server';
import { generateImage, pickImageSize, type ImageSize } from '@/services/ai-image';
import type { Platform } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Régénère une image IA pour un post déjà existant.
 * Body: { prompt: string; platforms?: Platform[]; size?: ImageSize; quality?: 'low'|'medium'|'high'|'auto' }
 * Réponse: { url, prompt, size }
 */
export async function POST(req: Request) {
  let body: {
    prompt?: string;
    platforms?: Platform[];
    size?: ImageSize;
    quality?: 'low' | 'medium' | 'high' | 'auto';
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const prompt = (body.prompt ?? '').trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });
  }
  if (prompt.length > 4000) {
    return NextResponse.json({ error: 'Prompt trop long' }, { status: 400 });
  }

  const size = body.size ?? pickImageSize(body.platforms);
  const quality = body.quality ?? 'medium';

  try {
    const result = await generateImage(prompt, { size, quality });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
