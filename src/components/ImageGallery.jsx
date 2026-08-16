
import React from "react";

/**
 * ImageGallery component
 * @param {Object} props
 * @param {Array<{src: string, alt?: string}>} props.images
 * @param {number} [props.maxHeight] - max height for images (px)
 */

import { useState, useCallback, useEffect } from "react";

const getFileKind = (src = '') => {
  const clean = src.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (clean.endsWith('.html') || clean.endsWith('.htm')) return 'html';
  return 'image';
};

const getFileName = (src = '') => decodeURIComponent(src.split('?')[0].split('/').pop() || 'file');

const modalStyles = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(20,24,36,0.96)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  transition: 'background 0.2s',
};

const arrowBtn = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'rgba(30,40,60,0.7)',
  border: 'none',
  color: '#fff',
  fontSize: 32,
  padding: '8px 16px',
  borderRadius: 32,
  cursor: 'pointer',
  zIndex: 10001,
  userSelect: 'none',
  transition: 'background 0.2s',
};

const closeBtn = {
  position: 'absolute',
  top: 24,
  right: 32,
  background: 'rgba(30,40,60,0.7)',
  border: 'none',
  color: '#fff',
  fontSize: 28,
  padding: '4px 16px',
  borderRadius: 32,
  cursor: 'pointer',
  zIndex: 10001,
  userSelect: 'none',
};

const ImageGallery = ({ images = [], maxHeight = 180 }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const openModal = useCallback((idx) => {
    setCurrentIdx(idx);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const showPrev = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIdx((idx) => (idx === 0 ? images.length - 1 : idx - 1));
  }, [images.length]);

  const showNext = useCallback((e) => {
    e?.stopPropagation();
    setCurrentIdx((idx) => (idx === images.length - 1 ? 0 : idx + 1));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modalOpen, showPrev, showNext, closeModal]);

  // Touch swipe navigation
  useEffect(() => {
    if (!modalOpen) return;
    let startX = null;
    const handleTouchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const handleTouchEnd = (e) => {
      if (startX === null) return;
      const endX = e.changedTouches[0].clientX;
      if (endX - startX > 60) showPrev();
      else if (startX - endX > 60) showNext();
      startX = null;
    };
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [modalOpen, showPrev, showNext]);

  if (!Array.isArray(images) || images.length === 0) {
    return <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 16 }}>No images to display</div>;
  }

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 16,
        alignItems: 'center',
        justifyItems: 'center',
      }}>
        {images.map((img, idx) => {
          const kind = getFileKind(img.src);
          return (
          <div key={idx} style={{
            background: '#151B28',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #232B3B',
            boxShadow: '0 2px 8px 0 rgba(59,130,246,0.06)',
            width: '100%',
            maxWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 60,
            cursor: 'pointer',
            transition: 'box-shadow 0.2s',
          }}
            onClick={() => openModal(idx)}
            title="Click to view fullscreen"
          >
            {kind === 'image' ? (
              <img
                src={img.src}
                alt={img.alt || `Image ${idx + 1}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: maxHeight,
                  objectFit: 'contain',
                  display: 'block',
                  background: '#232B3B',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div style={{
                width: '100%',
                minHeight: Math.min(maxHeight, 140),
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '16px 12px',
                background: '#232B3B',
              }}>
                <span style={{ fontSize: 32 }} aria-hidden="true">{kind === 'pdf' ? '📄' : '🌐'}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: '#9CA3AF',
                  textTransform: 'uppercase',
                }}>{kind}</span>
                <span style={{
                  fontSize: 11, color: '#D1D5DB', textAlign: 'center',
                  wordBreak: 'break-word', maxWidth: '100%',
                }}>{img.alt || getFileName(img.src)}</span>
              </div>
            )}
          </div>
          );
        })}
      </div>
      {modalOpen && (() => {
        const current = images[currentIdx];
        const kind = getFileKind(current.src);
        return (
        <div style={modalStyles} onClick={closeModal}>
          <button style={{ ...arrowBtn, left: 24 }} onClick={showPrev} aria-label="Previous file">&#8592;</button>
          {kind === 'image' ? (
            <img
              src={current.src}
              alt={current.alt || `Image ${currentIdx + 1}`}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: 12,
                boxShadow: '0 4px 32px 0 rgba(0,0,0,0.25)',
                background: '#232B3B',
                margin: '0 48px',
                objectFit: 'contain',
                display: 'block',
              }}
              onClick={e => e.stopPropagation()}
              draggable={false}
            />
          ) : (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '85vw',
                height: '80vh',
                margin: '0 48px',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 32px 0 rgba(0,0,0,0.25)',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <iframe
                src={current.src}
                title={current.alt || getFileName(current.src)}
                style={{ flex: 1, border: 'none' }}
              />
              <a
                href={current.src}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '8px 12px', fontSize: 12, textAlign: 'center',
                  background: '#151B28', color: '#93C5FD', textDecoration: 'none',
                }}
              >
                Open in new tab ↗
              </a>
            </div>
          )}
          <button style={{ ...arrowBtn, right: 24 }} onClick={showNext} aria-label="Next file">&#8594;</button>
          <button style={closeBtn} onClick={closeModal} aria-label="Close fullscreen">&#10005;</button>
        </div>
        );
      })()}
    </>
  );
};

export default ImageGallery;
