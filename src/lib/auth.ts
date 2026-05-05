import { uid, nowIso } from './utils';
import type { User } from '@/types';

export async function loginMock(email: string): Promise<User> {
  return { id: uid('usr'), email, name: email.split('@')[0], createdAt: nowIso() };
}

export async function signupMock(email: string, name: string): Promise<User> {
  return { id: uid('usr'), email, name: name || email.split('@')[0], createdAt: nowIso() };
}
