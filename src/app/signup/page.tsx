'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { signupMock } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const user = await signupMock(email, name);
    setUser(user);
    router.push('/dashboard');
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-ink-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-7 shadow-soft">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="font-semibold">Bienvenue sur RestoFlow</div>
            <div className="text-[11px] text-ink-500">Créez votre compte en 30s.</div>
          </div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marie Dupont"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Créer mon compte
          </Button>
        </form>
        <div className="mt-4 text-center text-xs text-ink-500">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
