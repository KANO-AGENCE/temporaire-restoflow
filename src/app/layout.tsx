import type { Metadata } from 'next';
import './globals.css';

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
