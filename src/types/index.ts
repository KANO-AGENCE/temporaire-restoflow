export type ID = string;

export type Platform = 'facebook' | 'instagram' | 'linkedin' | 'google';

export type Positioning =
  | 'gastronomique'
  | 'traditionnel'
  | 'brasserie'
  | 'fast-food'
  | 'bar'
  | 'cafe'
  | 'bistrot'
  | 'pizzeria';

export type Tone = 'premium' | 'familial' | 'fun' | 'local' | 'elegant' | 'accessible';

export type PostObjective =
  | 'notoriete'
  | 'reservation'
  | 'fidelisation'
  | 'evenement'
  | 'offre-speciale'
  | 'recrutement'
  | 'coulisses';

export type ContentFormat = 'post' | 'story' | 'carrousel' | 'google-post' | 'linkedin-post';

export type PostStatus =
  | 'brouillon'
  | 'a-valider'
  | 'valide'
  | 'programme'
  | 'publie'
  | 'refuse';

export interface User {
  id: ID;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Establishment {
  id: ID;
  userId: ID;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
  cuisineType?: string;
  positioning?: Positioning;
  tone?: Tone;
  targetAudience?: string;
  openingDays?: string[];
  hours?: string;
  specialties?: string;
  recurringOffers?: string;
  recurringEvents?: string;
  /** Plats de la carte permanente — alimente le sélecteur de plats du questionnaire. */
  menuItems?: string[];
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    googleBusiness?: string;
  };
  brandGuidelines?: string;
  brandHashtags?: {
    core?: string[];
    local?: string[];
    product?: string[];
    linkedin?: string[];
  };
  ctaLibrary?: string[];
  reservationUrl?: string;
  signaturePlatforms?: Platform[];
  createdAt: string;
}

export interface WatchContext {
  id: ID;
  establishmentId: ID;
  generatedAt: string;
  city: string;
  nationalTrends: string[];
  worldDays: { date: string; label: string }[];
  localEvents: { date: string; label: string }[];
  seasonality: string;
  weather?: string;
  schoolHolidays?: string;
  commercialEvents: { date: string; label: string }[];
  sportsCulture: { date: string; label: string }[];
  summary: string;
}

export interface QuestionnaireQuestion {
  id: ID;
  question: string;
  type: 'text' | 'textarea' | 'choice' | 'multi' | 'boolean';
  options?: string[];
  helper?: string;
}

export interface Questionnaire {
  id: ID;
  establishmentId: ID;
  watchContextId?: ID;
  generatedAt: string;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireAnswers {
  id: ID;
  questionnaireId: ID;
  answers: Record<string, string | string[] | boolean>;
  submittedAt: string;
}

export interface PostVersion {
  platform: Platform;
  text: string;
  hashtags: string[];
  callToAction?: string;
}

export interface MediaFile {
  id: ID;
  establishmentId: ID;
  url: string;
  source: 'ai' | 'upload';
  prompt?: string;
  uploadedAt: string;
  alt?: string;
}

export interface Post {
  id: ID;
  establishmentId: ID;
  date: string;
  time?: string;
  objective: PostObjective;
  format: ContentFormat;
  tone?: Tone;
  platforms: Platform[];
  versions: PostVersion[];
  visualIdea?: string;
  imagePrompt?: string;
  mediaId?: ID;
  status: PostStatus;
  comment?: string;
  createdAt: string;
  scheduledFor?: string;
  publishedAt?: string;
}

export interface EditorialCalendar {
  id: ID;
  establishmentId: ID;
  range: 'week' | 'month';
  startDate: string;
  endDate: string;
  postIds: ID[];
  createdAt: string;
}

export interface ValidationEntry {
  id: ID;
  postId: ID;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  decidedAt?: string;
}

export interface PublicationLog {
  id: ID;
  postId: ID;
  platform: Platform;
  status: 'scheduled' | 'published' | 'failed';
  message?: string;
  at: string;
}

export interface PlatformAccount {
  id: ID;
  establishmentId: ID;
  platform: Platform;
  connected: boolean;
  handle?: string;
  connectedAt?: string;
}

export interface Settings {
  preferredTone?: Tone;
  generationFrequency?: 'weekly' | 'monthly';
  defaultPlatforms?: Platform[];
  apiKeys?: { openai?: string };
}
