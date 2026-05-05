import { cn } from '@/lib/utils';
import type { PostStatus, Platform } from '@/types';

const STATUS_STYLES: Record<PostStatus, string> = {
  brouillon: 'bg-ink-100 text-ink-600',
  'a-valider': 'bg-amber-100 text-amber-700',
  valide: 'bg-emerald-100 text-emerald-700',
  programme: 'bg-blue-100 text-blue-700',
  publie: 'bg-violet-100 text-violet-700',
  refuse: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<PostStatus, string> = {
  brouillon: 'Brouillon',
  'a-valider': 'À valider',
  valide: 'Validé',
  programme: 'Programmé',
  publie: 'Publié',
  refuse: 'Refusé',
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const PLATFORM_STYLES: Record<Platform, string> = {
  facebook: 'bg-blue-50 text-blue-700 border-blue-200',
  instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  linkedin: 'bg-sky-50 text-sky-700 border-sky-200',
  google: 'bg-amber-50 text-amber-700 border-amber-200',
};

const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  google: 'Google',
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        PLATFORM_STYLES[platform]
      )}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700', className)}>
      {children}
    </span>
  );
}
