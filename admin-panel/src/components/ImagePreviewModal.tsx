'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  ExternalLink,
  Download,
  X,
  Maximize2,
  FileImage,
} from 'lucide-react';

interface ImageModalContextType {
  openImageModal: (src: string, title?: string) => void;
  closeImageModal: () => void;
}

const ImageModalContext = createContext<ImageModalContextType>({
  openImageModal: () => {},
  closeImageModal: () => {},
});

export const useImageModal = () => useContext(ImageModalContext);

export function ImageModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; src: string; title: string }>({
    isOpen: false,
    src: '',
    title: '',
  });

  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  const openImageModal = useCallback((src: string, title?: string) => {
    if (!src) return;
    setModalState({
      isOpen: true,
      src,
      title: title || 'Image Full Preview',
    });
    setScale(1);
    setRotate(0);
  }, []);

  const closeImageModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Keyboard shortcuts (ESC to close, +, -, r)
  useEffect(() => {
    if (!modalState.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeImageModal();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === '-' || e.key === '_') {
        setScale((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotate((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, closeImageModal]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotate((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotate(0);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(modalState.src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = modalState.title ? `${modalState.title.replace(/[^a-zA-Z0-9]/g, '_')}.png` : 'image_preview.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(modalState.src, '_blank');
    }
  };

  return (
    <ImageModalContext.Provider value={{ openImageModal, closeImageModal }}>
      {children}

      {/* FULL WIDTH IMAGE MODAL OVERLAY */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/92 backdrop-blur-lg flex flex-col justify-between items-center p-3 md:p-6 select-none animate-fadeIn"
          onClick={closeImageModal}
        >
          {/* Top Control Header */}
          <div
            className="w-full max-w-7xl flex items-center justify-between bg-dark-card/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-dark-border/80 shadow-2xl z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title Badge */}
            <div className="flex items-center space-x-3 min-w-0 pr-4">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0 border border-brand-500/30">
                <FileImage className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-white truncate">{modalState.title}</h3>
                <span className="text-[10px] text-dark-textMuted block font-mono">
                  Full Width HD Preview • Click image to toggle zoom
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <button
                onClick={handleZoomOut}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleRotate}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Rotate 90° (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Reset Zoom & Rotation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <div className="h-5 w-px bg-dark-border mx-1" />

              <a
                href={modalState.src}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Open original image in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleDownload}
                className="p-2 rounded-xl bg-dark-hover hover:bg-dark-border text-gray-300 hover:text-white transition-all border border-dark-border/60"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={closeImageModal}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-white transition-all border border-red-500/30 ml-2"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Canvas Container */}
          <div
            className="flex-1 w-full max-w-7xl flex items-center justify-center overflow-hidden my-3 relative"
            onClick={closeImageModal}
          >
            <div
              className="relative max-h-[82vh] max-w-[92vw] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={modalState.src}
                alt={modalState.title}
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                }}
                onClick={() => setScale((prev) => (prev === 1 ? 1.8 : 1))}
                className="max-h-[80vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-white/10 transition-transform duration-200 cursor-zoom-in"
              />
            </div>
          </div>

          {/* Footer Info Badge */}
          <div
            className="bg-dark-card/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-dark-border/80 text-[11px] text-dark-textMuted flex items-center space-x-3 shadow-lg z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Zoom: <strong className="text-white">{Math.round(scale * 100)}%</strong></span>
            <span>•</span>
            <span>Rotation: <strong className="text-white">{rotate}°</strong></span>
            <span>•</span>
            <span className="hidden sm:inline">Click image to toggle zoom • Press <kbd className="px-1.5 py-0.5 rounded bg-dark-border text-white text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      )}
    </ImageModalContext.Provider>
  );
}

interface PreviewableImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  title?: string;
  wrapperClassName?: string;
}

export function PreviewableImage({
  src,
  alt = 'Image',
  title,
  className = '',
  wrapperClassName = '',
  ...props
}: PreviewableImageProps) {
  const { openImageModal } = useImageModal();
  const displayTitle = title || alt || 'Image Preview';

  if (!src) return null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        openImageModal(src, displayTitle);
      }}
      className={`relative group cursor-pointer overflow-hidden ${wrapperClassName}`}
      title="Click to expand full width image modal"
    >
      <img
        src={src}
        alt={alt}
        className={`${className} transition-transform duration-300 group-hover:scale-105`}
        {...props}
      />
      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
        <div className="p-2 rounded-full bg-brand-500 text-black shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
          <Maximize2 className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
