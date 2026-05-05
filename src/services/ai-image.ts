import { getOpenAI, IMAGE_MODEL } from '@/lib/openai/client';

const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&q=80',
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=900&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80',
];

export async function generateImage(prompt: string): Promise<{ url: string; prompt: string }> {
  const openai = getOpenAI();
  if (!openai) {
    const url = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
    return { url, prompt };
  }
  try {
    const res = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: '1024x1024',
      n: 1,
    });
    const item = res.data?.[0];
    const url = item?.url ?? (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : MOCK_IMAGES[0]);
    return { url, prompt };
  } catch {
    return { url: MOCK_IMAGES[0], prompt };
  }
}
