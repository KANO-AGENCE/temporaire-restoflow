import type { Metadata } from 'next';
import './globals.css';

// L'app est intégralement pilotée par un état client (Zustand persisté localStorage).
// Aucun intérêt à pré-générer les pages: ça casserait au build et n'apporte rien.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'RestoFlow — Communication restaurant pilotée par IA',
  description: 'Plateforme SaaS de gestion de communication pour restaurants.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
