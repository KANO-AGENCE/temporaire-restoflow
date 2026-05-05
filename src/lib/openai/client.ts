import OpenAI from 'openai';

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI()) return null;
  if (_client) return _client;
  _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  return _client;
}

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini';
export const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
