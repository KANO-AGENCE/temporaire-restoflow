'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Bookmark,
  Globe2,
  Heart,
  MapPin,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Repeat2,
  Send,
  Share2,
  Star,
  ThumbsUp,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { Establishment, MediaFile, Platform, Post, PostVersion } from '@/types';

interface PostPreviewModalProps {
  open: boolean;
  onClose: () => void;
  post: Post | null;
  establishment: Establishment | null;
  media: MediaFile[];
}

export function PostPreviewModal({
  open,
  onClose,
  post,
  establishment,
  media,
}: PostPreviewModalProps) {
  const [tab, setTab] = useState<Platform | null>(null);

  useEffect(() => {
    if (!post) return;
    setTab(post.platforms[0] ?? null);
  }, [post?.id]);

  if (!post || !establishment) return null;

  const visual = post.mediaId ? media.find((m) => m.id === post.mediaId) : null;
  const cover =
    media.find((m) => m.establishmentId === establishment.id)?.url ??
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80';
  const activeVersion = tab ? post.versions.find((v) => v.platform === tab) : null;

  return (
    <Modal open={open} onClose={onClose} title="Aperçu de la publication" size="xl">
      <div className="space-y-4">
        {/* Onglets plateformes */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-ink-100 p-1 text-sm">
          {post.platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                tab === p
                  ? 'bg-white text-ink-900 shadow'
                  : 'text-ink-600 hover:text-ink-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Mockup centré sur fond plateforme-coloré */}
        {tab && activeVersion ? (
          <div
            className={`flex justify-center rounded-xl p-4 sm:p-6 ${BACKGROUND_BY_PLATFORM[tab]}`}
          >
            {tab === 'instagram' && (
              <InstagramPreview
                handle={getHandle(establishment.socialLinks?.instagram, establishment.name)}
                avatarUrl={cover}
                imageUrl={visual?.url}
                version={activeVersion}
                cityLabel={establishment.city}
              />
            )}
            {tab === 'facebook' && (
              <FacebookPreview
                pageName={establishment.name}
                avatarUrl={cover}
                imageUrl={visual?.url}
                version={activeVersion}
                cityLabel={establishment.city}
              />
            )}
            {tab === 'linkedin' && (
              <LinkedInPreview
                companyName={establishment.name}
                tagline={
                  establishment.cuisineType ?? `Restaurant à ${establishment.city}`
                }
                avatarUrl={cover}
                imageUrl={visual?.url}
                version={activeVersion}
              />
            )}
            {tab === 'google' && (
              <GooglePreview
                businessName={establishment.name}
                cityLabel={establishment.city}
                imageUrl={visual?.url}
                version={activeVersion}
              />
            )}
          </div>
        ) : (
          <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500">
            Aucune version pour cette plateforme.
          </p>
        )}

        {/* Footer infos */}
        {activeVersion ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2 text-[11px] text-ink-500">
            <span>
              <strong className="text-ink-700">{activeVersion.text.length}</strong> caractères ·{' '}
              <strong className="text-ink-700">{activeVersion.hashtags.length}</strong> hashtag
              {activeVersion.hashtags.length > 1 ? 's' : ''}
            </span>
            {activeVersion.callToAction ? (
              <span className="truncate">
                CTA : <span className="font-medium text-ink-700">{activeVersion.callToAction}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Helpers                                                      */
/* ─────────────────────────────────────────────────────────── */

const BACKGROUND_BY_PLATFORM: Record<Platform, string> = {
  instagram: 'bg-gradient-to-br from-fuchsia-50 to-amber-50',
  facebook: 'bg-[#f0f2f5]',
  linkedin: 'bg-[#f3f2ef]',
  google: 'bg-slate-100',
};

function getHandle(url: string | undefined, fallback: string): string {
  if (!url) return slugifyHandle(fallback);
  const match = url.match(
    /(?:instagram\.com|facebook\.com|linkedin\.com\/(?:in|company)|x\.com|twitter\.com)\/([^/?#]+)/i
  );
  if (match) return match[1].replace(/^@/, '');
  return slugifyHandle(fallback);
}

function slugifyHandle(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function Avatar({ url, alt, size = 32, ring }: { url: string; alt: string; size?: number; ring?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-ink-200 ${ring ?? ''}`}
      style={{ width: size, height: size }}
    >
      <Image src={url} alt={alt} fill className="object-cover" unoptimized sizes={`${size}px`} />
    </div>
  );
}

function ImageOrPlaceholder({
  url,
  alt,
  aspect = 'aspect-square',
}: {
  url: string | undefined;
  alt: string;
  aspect?: string;
}) {
  if (!url) {
    return (
      <div className={`relative ${aspect} w-full bg-gradient-to-br from-ink-100 to-ink-200`}>
        <div className="absolute inset-0 grid place-items-center text-xs text-ink-400">
          Visuel manquant
        </div>
      </div>
    );
  }
  return (
    <div className={`relative ${aspect} w-full bg-ink-100`}>
      <Image src={url} alt={alt} fill className="object-cover" unoptimized sizes="(max-width: 768px) 100vw, 600px" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Instagram                                                    */
/* ─────────────────────────────────────────────────────────── */

function InstagramPreview({
  handle,
  avatarUrl,
  imageUrl,
  version,
  cityLabel,
}: {
  handle: string;
  avatarUrl: string;
  imageUrl: string | undefined;
  version: PostVersion;
  cityLabel?: string;
}) {
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="rounded-full bg-white p-[2px]">
            <Avatar url={avatarUrl} alt={handle} size={30} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-tight">{handle}</div>
          {cityLabel ? (
            <div className="text-[11px] text-ink-500">{cityLabel}</div>
          ) : null}
        </div>
        <MoreHorizontal size={18} className="text-ink-700" />
      </div>

      {/* Image */}
      <ImageOrPlaceholder url={imageUrl} alt={handle} aspect="aspect-square" />

      {/* Action bar */}
      <div className="flex items-center gap-3 px-3 py-2">
        <Heart size={22} strokeWidth={1.8} />
        <MessageCircle size={22} strokeWidth={1.8} />
        <Send size={22} strokeWidth={1.8} />
        <Bookmark size={22} strokeWidth={1.8} className="ml-auto" />
      </div>

      {/* Likes */}
      <div className="px-3 text-[13px] font-semibold">
        {Math.floor(50 + Math.random() * 250)} J&apos;aime
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 pt-1 text-[13px] leading-snug">
        <span className="font-semibold">{handle}</span>{' '}
        <span className="whitespace-pre-wrap text-ink-800">{version.text}</span>
        {version.hashtags.length > 0 ? (
          <div className="mt-1 text-[12px] leading-snug text-[#00376b]">
            {version.hashtags.join(' ')}
          </div>
        ) : null}
        <div className="mt-1 text-[11px] uppercase tracking-wide text-ink-400">il y a 2 h</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Facebook                                                     */
/* ─────────────────────────────────────────────────────────── */

function FacebookPreview({
  pageName,
  avatarUrl,
  imageUrl,
  version,
  cityLabel,
}: {
  pageName: string;
  avatarUrl: string;
  imageUrl: string | undefined;
  version: PostVersion;
  cityLabel?: string;
}) {
  return (
    <div className="w-full max-w-[500px] overflow-hidden rounded-xl bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-2.5 px-4 pt-3">
        <Avatar url={avatarUrl} alt={pageName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold leading-tight text-[#050505]">
            {pageName}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#65676b]">
            <span>2 h</span>
            <span>·</span>
            <Globe2 size={11} />
            {cityLabel ? <span className="ml-1">· {cityLabel}</span> : null}
          </div>
        </div>
        <MoreHorizontal size={20} className="text-[#65676b]" />
      </div>

      {/* Texte */}
      <div className="px-4 pb-3 pt-2 text-[15px] leading-snug text-[#050505]">
        <p className="whitespace-pre-wrap">{version.text}</p>
        {version.hashtags.length > 0 ? (
          <p className="mt-1 text-[14px] text-[#1877f2]">{version.hashtags.join(' ')}</p>
        ) : null}
      </div>

      {/* Image */}
      <ImageOrPlaceholder url={imageUrl} alt={pageName} aspect="aspect-square" />

      {/* Réactions */}
      <div className="flex items-center justify-between px-4 py-2 text-[13px] text-[#65676b]">
        <div className="flex items-center gap-1">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1877f2] text-white">
            <ThumbsUp size={11} fill="white" strokeWidth={0} />
          </span>
          <span className="grid h-5 w-5 -ml-1.5 place-items-center rounded-full bg-[#f33e58] text-white">
            <Heart size={10} fill="white" strokeWidth={0} />
          </span>
          <span className="ml-1">{Math.floor(80 + Math.random() * 400)}</span>
        </div>
        <span>{Math.floor(3 + Math.random() * 30)} commentaires · {Math.floor(1 + Math.random() * 12)} partages</span>
      </div>

      {/* Action bar */}
      <div className="grid grid-cols-3 border-t border-ink-100 text-[14px] font-medium text-[#65676b]">
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-ink-50">
          <ThumbsUp size={18} /> J&apos;aime
        </button>
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-ink-50">
          <MessageSquare size={18} /> Commenter
        </button>
        <button className="flex items-center justify-center gap-2 py-2 hover:bg-ink-50">
          <Share2 size={18} /> Partager
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* LinkedIn                                                     */
/* ─────────────────────────────────────────────────────────── */

function LinkedInPreview({
  companyName,
  tagline,
  avatarUrl,
  imageUrl,
  version,
}: {
  companyName: string;
  tagline: string;
  avatarUrl: string;
  imageUrl: string | undefined;
  version: PostVersion;
}) {
  return (
    <div className="w-full max-w-[550px] overflow-hidden rounded-lg border border-ink-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-2.5 px-4 pt-3">
        <Avatar url={avatarUrl} alt={companyName} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[14px] font-semibold leading-tight text-[#000000e6]">
            {companyName}
          </div>
          <div className="text-[12px] leading-tight text-[#00000099]">{tagline}</div>
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-[#00000099]">
            <span>2 h</span>
            <span>·</span>
            <Globe2 size={11} />
          </div>
        </div>
        <button className="rounded-full px-3 py-1 text-[14px] font-semibold text-[#0a66c2] hover:bg-sky-50">
          + Suivre
        </button>
      </div>

      {/* Texte */}
      <div className="px-4 pb-3 pt-2 text-[14px] leading-snug text-[#000000e6]">
        <p className="whitespace-pre-wrap">{version.text}</p>
        {version.hashtags.length > 0 ? (
          <p className="mt-2 text-[14px] text-[#0a66c2]">{version.hashtags.join(' ')}</p>
        ) : null}
      </div>

      {/* Image (paysage privilégié sur LinkedIn) */}
      <ImageOrPlaceholder url={imageUrl} alt={companyName} aspect="aspect-[3/2]" />

      {/* Réactions */}
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2 text-[12px] text-[#00000099]">
        <div className="flex items-center gap-1">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#0a66c2] text-white">
            <ThumbsUp size={9} fill="white" strokeWidth={0} />
          </span>
          <span className="ml-1">{Math.floor(20 + Math.random() * 120)}</span>
        </div>
        <span>{Math.floor(2 + Math.random() * 18)} commentaires · {Math.floor(0 + Math.random() * 6)} reposts</span>
      </div>

      {/* Action bar */}
      <div className="grid grid-cols-4 text-[14px] font-semibold text-[#00000099]">
        <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-ink-50">
          <ThumbsUp size={18} /> J&apos;aime
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-ink-50">
          <MessageSquare size={18} /> Commenter
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-ink-50">
          <Repeat2 size={18} /> Republier
        </button>
        <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-ink-50">
          <Send size={18} /> Envoyer
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Google Business Profile                                      */
/* ─────────────────────────────────────────────────────────── */

function GooglePreview({
  businessName,
  cityLabel,
  imageUrl,
  version,
}: {
  businessName: string;
  cityLabel: string;
  imageUrl: string | undefined;
  version: PostVersion;
}) {
  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm">
      {/* En-tête de fiche */}
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-2 text-[12px]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
          G
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink-900">{businessName}</div>
          <div className="flex items-center gap-1 text-[11px] text-ink-500">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span>4,7 (218)</span>
            <span>·</span>
            <MapPin size={10} />
            <span>{cityLabel}</span>
          </div>
        </div>
      </div>

      {/* Chip catégorie */}
      <div className="px-4 pt-3">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          Mise à jour
        </span>
      </div>

      {/* Image (paysage 4:3) */}
      <div className="px-4 pt-2">
        <div className="overflow-hidden rounded-lg">
          <ImageOrPlaceholder url={imageUrl} alt={businessName} aspect="aspect-[4/3]" />
        </div>
      </div>

      {/* Texte (compact, pas de hashtag sur Google Business) */}
      <div className="px-4 pb-3 pt-3 text-[13.5px] leading-snug text-ink-800">
        <p className="whitespace-pre-wrap">{version.text}</p>
      </div>

      {/* CTA buttons (style Google) */}
      <div className="flex items-center gap-2 border-t border-ink-100 px-4 py-2 text-[13px] font-medium text-blue-600">
        {version.callToAction ? (
          <button className="rounded-full border border-blue-200 px-3 py-1 hover:bg-blue-50">
            {version.callToAction}
          </button>
        ) : (
          <button className="rounded-full border border-blue-200 px-3 py-1 hover:bg-blue-50">
            En savoir plus
          </button>
        )}
        <button className="ml-auto inline-flex items-center gap-1 rounded-full border border-ink-200 px-3 py-1 text-ink-700 hover:bg-ink-50">
          <Phone size={12} /> Appeler
        </button>
      </div>
    </div>
  );
}
