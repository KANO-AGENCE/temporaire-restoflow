'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/lib/store';
import { loginMock } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState('demo@joecarpa.fr');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const user = await loginMock(email);
    setUser(user);
    router.push('/dashboard');
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — visuel brand */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1558030006-450675393462?w=1600&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-plate-gradient" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/90">
              <Sparkles size={18} />
            </span>
            RestoFlow
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-brand-200">
              Étude de cas en cours
            </p>
            <h1 className="mt-3 font-display text-4xl leading-tight">
              Joe Carpa, Angers — la maison du beef.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-100/90">
              Brasserie tendance, ardoise des viandes (Galice, Wagyu, Rouge des Prés AOP),
              carpaccios infinis, JaykeBox certains jeudis. Pilotez la com des 4 supports
              depuis un seul écran.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-100/70">
            <Flame size={14} className="text-brand-300" />
            Pipeline IA — veille → questionnaire → calendrier complet
          </div>
        </div>
      </div>

      {/* Right — formulaire */}
      <div className="grid place-items-center bg-ink-50 p-6">
        <div className="w-full max-w-sm rounded-2xl border border-ink-200 bg-white p-7 shadow-soft">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-ember-gradient text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="font-semibold">RestoFlow</div>
              <div className="text-[11px] text-ink-500">Communication restaurant</div>
            </div>
          </div>
          <h2 className="font-display text-xl font-semibold">Connexion</h2>
          <p className="mb-5 mt-1 text-xs text-ink-500">
            Démo locale — l'auth Supabase s'active via .env.local
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
              hint="Mode démo : n'importe quelle valeur convient."
            />
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Se connecter
            </Button>
          </form>
          <div className="mt-4 text-center text-xs text-ink-500">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="font-medium text-brand-700 hover:underline">
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
