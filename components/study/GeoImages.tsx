"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, ExternalLink, X } from 'lucide-react'
import { useTranslation } from '../../app/i18n/client'

interface GeoImage {
  id: string;
  url: string;
  fileUrl: string;
  thumbnailUrl: string;
  description: string;
  credit: string;
  creditUrl: string;
  license: string;
  placeName: string;
  verses: string[];
  modernId: string;
}

interface GeoImagesProps {
  book: string;
  chapter: number;
  className?: string;
  variant?: 'grid' | 'strip';
}

/** Best available image URL: fileUrl is a direct upload.wikimedia.org path that always loads */
function imgSrc(img: GeoImage): string {
  return img.fileUrl || img.thumbnailUrl;
}

/** Shared lightbox - rendered via createPortal in both strip and grid variants */
function LightboxContent({ selected, onClose }: { selected: GeoImage; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, backgroundColor: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff', borderRadius: 20,
          boxShadow: '0 32px 64px rgba(0,0,0,0.35)',
          width: '100%', maxWidth: 560, overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cover image */}
        <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc(selected)}
            alt={selected.placeName}
            loading="eager"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = selected.thumbnailUrl; }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%)',
            pointerEvents: 'none',
          }} />
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 34, height: 34, borderRadius: '50%',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.65)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.45)'}
          >
            <X size={15} color="#fff" />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 3, height: 28, borderRadius: 2, backgroundColor: '#0D9488', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>
                {selected.placeName}
              </p>
              {selected.modernId && (
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{selected.modernId}</p>
              )}
            </div>
          </div>

          {selected.verses.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {selected.verses.map(v => (
                <span key={v} style={{
                  fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 999,
                  backgroundColor: 'rgba(13,148,136,0.07)', color: '#0D9488',
                  border: '1px solid rgba(13,148,136,0.18)',
                }}>{v}</span>
              ))}
            </div>
          )}

          {selected.description && (
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7, margin: '0 0 16px' }}>
              {selected.description}
            </p>
          )}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: 14, borderTop: '1px solid #F3F4F6', gap: 8, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {selected.license && (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                  padding: '2px 7px', borderRadius: 5,
                  backgroundColor: '#F3F4F6', color: '#6B7280', textTransform: 'uppercase',
                }}>{selected.license}</span>
              )}
              {selected.credit && (
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>© {selected.credit}</span>
              )}
            </div>
            {selected.creditUrl && (
              <a
                href={selected.creditUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: '#0D9488', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.textDecoration = 'none'}
              >
                Bekijk bron <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GeoImages({ book, chapter, className, variant = 'grid' }: GeoImagesProps) {
  const { t } = useTranslation('study');
  const [images, setImages]   = useState<GeoImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GeoImage | null>(null);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!book || !chapter) return;
    setLoading(true);
    setImages([]);

    fetch(`/api/geo/images?book=${encodeURIComponent(book)}&chapter=${chapter}`)
      .then(r => r.ok ? r.json() : { images: [] })
      .then(data => setImages(data.images || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, [book, chapter]);

  // Close on Escape key
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  if (loading) {
    if (variant === 'strip') {
      return (
        <div className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-card flex-shrink-0">
          <div style={{ display: 'flex', gap: 10, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-gray-100 dark:border-border" style={{ flexShrink: 0, width: 130, borderRadius: 10, overflow: 'hidden' }}>
                <div className="animate-pulse bg-gray-100 dark:bg-secondary" style={{ height: 78 }} />
                <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="animate-pulse bg-gray-100 dark:bg-secondary rounded" style={{ height: 9, width: '70%' }} />
                  <div className="animate-pulse bg-gray-100 dark:bg-secondary rounded" style={{ height: 7, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4" style={{ color: '#0D9488' }} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Locaties in dit hoofdstuk</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-gray-100 dark:border-border overflow-hidden">
              <div className="bg-gray-100 dark:bg-secondary animate-pulse" style={{ height: 110 }} />
              <div className="p-3 space-y-1.5">
                <div className="h-2.5 bg-gray-100 dark:bg-secondary rounded animate-pulse w-3/4" />
                <div className="h-2 bg-gray-100 dark:bg-secondary rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0 && !loading) return null;

  /* ── Strip variant ─────────────────────────────────────────── */
  if (variant === 'strip') {
    return (
      <>
        {/* Pinned strip - no scroll needed to see it */}
        <div className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-card flex-shrink-0">
          <div style={{ display: 'flex', gap: 10, padding: '12px 20px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {images.map((image, index) => (
              <button
                key={`${image.id}-${index}`}
                onClick={() => setSelected(image)}
                className="border border-gray-200 dark:border-border bg-white dark:bg-secondary text-left"
                style={{
                  flexShrink: 0, width: 130,
                  borderRadius: 10, overflow: 'hidden',
                  cursor: 'pointer', padding: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div className="bg-gray-100 dark:bg-secondary/60" style={{ height: 78, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc(image)}
                    alt={image.placeName}
                    loading="eager"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ padding: '5px 8px 7px' }}>
                  <p className="text-gray-900 dark:text-foreground" style={{
                    fontSize: 11, fontWeight: 600, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {image.placeName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lightbox - same portal as grid variant */}
        {selected && mounted && createPortal(
          <LightboxContent selected={selected} onClose={() => setSelected(null)} />,
          document.body
        )}
      </>
    );
  }

  /* ── Grid variant (default) ────────────────────────────────── */
  const lightbox = selected && mounted
    ? createPortal(<LightboxContent selected={selected} onClose={() => setSelected(null)} />, document.body)
    : null;

  return (
    <>
      <div className={className}>
        {/* Section header */}
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#0D9488' }} />
          <span className="text-sm font-semibold text-gray-700">
            {t('geo_images.locations_in_book_chapter', { book, chapter })}
          </span>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.id}-${index}`}
              onClick={() => setSelected(image)}
              className="group text-left rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none"
            >
              {/* Thumbnail - thumbnailUrl is always a valid image URL */}
              <div style={{ height: 110, overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc(image)}
                  alt={image.placeName}
                  loading="eager"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s',
                  }}
                  className="group-hover:scale-105"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = image.thumbnailUrl; }}
                />
              </div>
              {/* Caption */}
              <div style={{ padding: '8px 12px 10px' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', margin: 0 }}>
                  {image.placeName}
                </p>
                {image.description && (
                  <p style={{ fontSize: 11, color: '#9CA3AF', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 2 }}>
                    {image.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {lightbox}
    </>
  );
}
