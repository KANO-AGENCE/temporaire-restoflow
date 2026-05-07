import { getOpenAI, IMAGE_MODEL } from '@/lib/openai/client';
import type { Platform } from '@/types';

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80',
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80',
];

export type ImageSize = '1024x1024' | '1536x1024' | '1024x1536';

/**
 * Choisit le format d'image cible selon les plateformes du post.
 * - LinkedIn / Google Business uniquement → paysage 1536x1024 (1.5:1, proche du 1.91:1)
 * - Sinon → carré 1024x1024 (compatible IG/FB feed et IG portrait approximatif)
 */
export function pickImageSize(platforms: Platform[] | undefined): ImageSize {
  if (!platforms || platforms.length === 0) return '1024x1024';
  const onlyLandscape = platforms.every(
    (p) => p === 'linkedin' || p === 'google'
  );
  if (onlyLandscape) return '1536x1024';
  return '1024x1024';
}

interface GenerateImageOptions {
  size?: ImageSize;
  /** 'low' = 256-ish, 'medium' = 1024 normal, 'high' = top qualité. Default: 'medium'. */
  quality?: 'low' | 'medium' | 'high' | 'auto';
}

export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<{ url: string; prompt: string; size: ImageSize }> {
  const size = options.size ?? '1024x1024';
  const quality = options.quality ?? 'medium';

  const openai = getOpenAI();
  if (!openai) {
    const url = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
    return { url, prompt, size };
  }
  try {
    // gpt-image-1 — quality + size param. Le SDK type `quality` strictement,
    // on cast pour rester compatible avec les anciennes signatures DALL-E 2/3.
    const res = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size,
      n: 1,
      quality,
    } as Parameters<typeof openai.images.generate>[0]);
    const item = res.data?.[0];
    const url =
      item?.url ??
      (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : MOCK_IMAGES[0]);
    return { url, prompt, size };
  } catch (err) {
    console.error('[ai-image] generation failed:', err);
    return { url: MOCK_IMAGES[0], prompt, size };
  }
}
