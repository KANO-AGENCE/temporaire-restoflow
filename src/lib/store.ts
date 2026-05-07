'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Establishment,
  MediaFile,
  PlatformAccount,
  Post,
  PublicationLog,
  Questionnaire,
  QuestionnaireAnswers,
  Settings,
  User,
  ValidationEntry,
  WatchContext,
} from '@/types';
import { seedData } from './seed';

const SEED_VERSION = 4;

interface AppState {
  hydrated: boolean;
  seedVersion?: number;
  user: User | null;
  activeEstablishmentId: string | null;
  establishments: Establishment[];
  watches: WatchContext[];
  questionnaires: Questionnaire[];
  answers: QuestionnaireAnswers[];
  posts: Post[];
  media: MediaFile[];
  validations: ValidationEntry[];
  publications: PublicationLog[];
  platformAccounts: PlatformAccount[];
  settings: Settings;

  setUser: (u: User | null) => void;
  logout: () => void;
  setActiveEstablishment: (id: string | null) => void;

  addEstablishment: (e: Establishment) => void;
  updateEstablishment: (id: string, patch: Partial<Establishment>) => void;
  removeEstablishment: (id: string) => void;

  addWatch: (w: WatchContext) => void;
  addQuestionnaire: (q: Questionnaire) => void;
  saveAnswers: (a: QuestionnaireAnswers) => void;

  addPosts: (posts: Post[]) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  removePost: (id: string) => void;

  addMedia: (m: MediaFile) => void;
  removeMedia: (id: string) => void;

  decideValidation: (postId: string, decision: 'approved' | 'rejected', comment?: string) => void;

  addPublicationLog: (l: PublicationLog) => void;

  upsertPlatformAccount: (a: PlatformAccount) => void;

  updateSettings: (patch: Partial<Settings>) => void;

  resetDemo: () => void;
  reseedDemo: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seedVersion: undefined,
      user: null,
      activeEstablishmentId: null,
      establishments: [],
      watches: [],
      questionnaires: [],
      answers: [],
      posts: [],
      media: [],
      validations: [],
      publications: [],
      platformAccounts: [],
      settings: {
        preferredTone: 'accessible',
        generationFrequency: 'weekly',
        defaultPlatforms: ['instagram', 'facebook'],
      },

      setUser: (u) => {
        if (u && get().establishments.length === 0) {
          const seed = seedData(u.id);
          set({
            user: u,
            establishments: seed.establishments,
            posts: seed.posts,
            media: seed.media,
            validations: seed.validations,
            platformAccounts: seed.platformAccounts,
            activeEstablishmentId: seed.establishments[0]?.id ?? null,
          });
        } else {
          set({ user: u });
          if (u && !get().activeEstablishmentId) {
            const first = get().establishments.find((e) => e.userId === u.id);
            if (first) set({ activeEstablishmentId: first.id });
          }
        }
      },

      logout: () => set({ user: null }),

      setActiveEstablishment: (id) => set({ activeEstablishmentId: id }),

      addEstablishment: (e) =>
        set((s) => ({
          establishments: [...s.establishments, e],
          activeEstablishmentId: s.activeEstablishmentId ?? e.id,
        })),

      updateEstablishment: (id, patch) =>
        set((s) => ({
          establishments: s.establishments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      removeEstablishment: (id) =>
        set((s) => ({
          establishments: s.establishments.filter((e) => e.id !== id),
          activeEstablishmentId:
            s.activeEstablishmentId === id
              ? s.establishments.find((e) => e.id !== id)?.id ?? null
              : s.activeEstablishmentId,
          posts: s.posts.filter((p) => p.establishmentId !== id),
          media: s.media.filter((m) => m.establishmentId !== id),
        })),

      addWatch: (w) => set((s) => ({ watches: [w, ...s.watches] })),

      addQuestionnaire: (q) => set((s) => ({ questionnaires: [q, ...s.questionnaires] })),

      saveAnswers: (a) =>
        set((s) => ({
          answers: [a, ...s.answers.filter((x) => x.questionnaireId !== a.questionnaireId)],
        })),

      addPosts: (posts) => {
        set((s) => ({
          posts: [...posts, ...s.posts],
          validations: [
            ...posts
              .filter((p) => p.status === 'a-valider')
              .map((p) => ({ id: `val_${p.id}`, postId: p.id, status: 'pending' as const })),
            ...s.validations,
          ],
        }));
      },

      updatePost: (id, patch) =>
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      removePost: (id) =>
        set((s) => ({
          posts: s.posts.filter((p) => p.id !== id),
          validations: s.validations.filter((v) => v.postId !== id),
        })),

      addMedia: (m) => set((s) => ({ media: [m, ...s.media] })),

      removeMedia: (id) => set((s) => ({ media: s.media.filter((m) => m.id !== id) })),

      decideValidation: (postId, decision, comment) =>
        set((s) => ({
          validations: s.validations.map((v) =>
            v.postId === postId
              ? { ...v, status: decision, comment, decidedAt: new Date().toISOString() }
              : v
          ),
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, status: decision === 'approved' ? 'valide' : 'refuse', comment }
              : p
          ),
        })),

      addPublicationLog: (l) => set((s) => ({ publications: [l, ...s.publications] })),

      upsertPlatformAccount: (a) =>
        set((s) => {
          const existing = s.platformAccounts.find(
            (x) => x.establishmentId === a.establishmentId && x.platform === a.platform
          );
          return {
            platformAccounts: existing
              ? s.platformAccounts.map((x) => (x.id === existing.id ? { ...existing, ...a } : x))
              : [...s.platformAccounts, a],
          };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetDemo: () =>
        set({
          establishments: [],
          watches: [],
          questionnaires: [],
          answers: [],
          posts: [],
          media: [],
          validations: [],
          publications: [],
          platformAccounts: [],
          activeEstablishmentId: null,
        }),

      reseedDemo: () => {
        const u = get().user;
        if (!u) return;
        const seed = seedData(u.id);
        set({
          establishments: seed.establishments,
          watches: [],
          questionnaires: [],
          answers: [],
          posts: seed.posts,
          media: seed.media,
          validations: seed.validations,
          publications: [],
          platformAccounts: seed.platformAccounts,
          activeEstablishmentId: seed.establishments[0]?.id ?? null,
          seedVersion: SEED_VERSION,
        });
      },
    }),
    {
      name: 'restoflow-store',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
        // Auto-reseed si la version de seed locale est obsolète
        if (state.user && state.seedVersion !== SEED_VERSION) {
          const seed = seedData(state.user.id);
          state.establishments = seed.establishments;
          state.posts = seed.posts;
          state.media = seed.media;
          state.validations = seed.validations;
          state.platformAccounts = seed.platformAccounts;
          state.activeEstablishmentId = seed.establishments[0]?.id ?? null;
          state.watches = [];
          state.questionnaires = [];
          state.answers = [];
          state.publications = [];
          state.seedVersion = SEED_VERSION;
        }
      },
    }
  )
);
