"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react'
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
function LightboxContent({
  images, index, onClose, onPrev, onNext, onSelect,
}: {
  images: GeoImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onSelect: (i: number) => void
}) {
  const selected = images[index]
  const hasMultiple = images.length > 1
  const navBtnStyle: React.CSSProperties = {
    width: 38, height: 38, borderRadius: '50%',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
    transition: 'background-color 0.15s, transform 0.15s',
  }
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
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cover image */}
        <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={selected.id + '-' + index}
            src={imgSrc(selected)}
            alt={selected.placeName}
            loading="eager"
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.currentTarget as HTMLImageElement).src = selected.thumbnailUrl; }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 35%)',
            pointerEvents: 'none',
          }} />

          {/* Prev / Next navigation */}
          {hasMultiple && (
            <>
              <button
                onClick={onPrev}
                aria-label="Vorige afbeelding"
                style={{
                  ...navBtnStyle,
                  position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.5)'}
              >
                <ChevronLeft size={18} color="#fff" />
              </button>
              <button
                onClick={onNext}
                aria-label="Volgende afbeelding"
                style={{
                  ...navBtnStyle,
                  position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.7)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.5)'}
              >
                <ChevronRight size={18} color="#fff" />
              </button>
              {/* Counter */}
              <div style={{
                position: 'absolute', top: 12, left: 12,
                padding: '4px 10px', borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
                color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              }}>
                {index + 1} / {images.length}
              </div>
            </>
          )}

          <button
            onClick={onClose}
            aria-label="Sluiten"
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

          {/* Thumbnail strip for quick jumping */}
          {hasMultiple && (
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto',
              paddingTop: 14, marginTop: 16, borderTop: '1px solid #F3F4F6',
            }}>
              {images.map((img, i) => (
                <button
                  key={`${img.id}-${i}`}
                  onClick={() => onSelect(i)}
                  aria-label={`Toon ${img.placeName}`}
                  style={{
                    flexShrink: 0, width: 56, height: 42,
                    borderRadius: 6, overflow: 'hidden', padding: 0,
                    border: i === index ? '2px solid #0D9488' : '2px solid transparent',
                    cursor: 'pointer', backgroundColor: '#F3F4F6',
                    transition: 'transform 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={e => {
                    if (i !== index) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc(img)}
                    alt={img.placeName}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeoImages({ book, chapter, className, variant = 'grid' }: GeoImagesProps) {
  const { t } = useTranslation('study');
  const [images, setImages]   = useState<GeoImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
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

  const goPrev = useCallback(() => {
    setActiveIndex(i => {
      if (i === null || images.length === 0) return i;
      return (i - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex(i => {
      if (i === null || images.length === 0) return i;
      return (i + 1) % images.length;
    });
  }, [images.length]);

  // Keyboard handlers: Escape closes, arrows navigate
  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveIndex(null);
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, goPrev, goNext]);

  if (loading) {
    if (variant === 'strip') {
      return (
        <div className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-card flex-none">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px 10px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border border-gray-100 dark:border-border" style={{ width: 88, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <div className="animate-pulse bg-gray-100 dark:bg-secondary" style={{ height: 60 }} />
                <div style={{ padding: '4px 6px 6px' }}>
                  <div className="animate-pulse bg-gray-100 dark:bg-secondary rounded" style={{ height: 8, width: '70%' }} />
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

  if (images.length === 0 && !loading) {
    if (variant === 'strip') {
      return (
        <div className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-card flex-none">
          <p className="text-[11px] text-gray-400 dark:text-muted-foreground italic px-4 py-2.5">
            Geen locatieafbeeldingen gevonden voor dit hoofdstuk.
          </p>
        </div>
      );
    }
    return null;
  }

  /* ── Strip variant ─────────────────────────────────────────── */
  if (variant === 'strip') {
    return (
      <>
        <div className="border-b border-gray-100 dark:border-border bg-gray-50 dark:bg-card flex-none">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 16px 10px' }}>
            {images.map((image, index) => (
              <button
                key={`${image.id}-${index}`}
                onClick={() => setActiveIndex(index)}
                className="border border-gray-200 dark:border-border bg-white dark:bg-secondary text-left"
                style={{
                  width: 88, flexShrink: 0,
                  borderRadius: 8, overflow: 'hidden',
                  cursor: 'pointer', padding: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 8px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div className="bg-gray-100 dark:bg-secondary/60" style={{ height: 60, overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc(image)}
                    alt={image.placeName}
                    loading="lazy"
                    decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).src = image.thumbnailUrl; }}
                  />
                </div>
                <div style={{ padding: '4px 6px 5px' }}>
                  <p className="text-gray-900 dark:text-foreground" style={{
                    fontSize: 10, fontWeight: 600, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {image.placeName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {activeIndex !== null && mounted && createPortal(
          <LightboxContent
            images={images}
            index={activeIndex}
            onClose={() => setActiveIndex(null)}
            onPrev={goPrev}
            onNext={goNext}
            onSelect={setActiveIndex}
          />,
          document.body
        )}
      </>
    );
  }

  /* ── Grid variant (default) ────────────────────────────────── */
  const lightbox = activeIndex !== null && mounted
    ? createPortal(
        <LightboxContent
          images={images}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={setActiveIndex}
        />,
        document.body,
      )
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
              onClick={() => setActiveIndex(index)}
              className="group text-left rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow focus:outline-none"
            >
              <div style={{ height: 110, overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc(image)}
                  alt={image.placeName}
                  loading="lazy"
                  decoding="async"
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
