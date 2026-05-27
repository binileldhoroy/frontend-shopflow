import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ show, onHide, title, children, size = 'md', footer }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [show]);

  // Scroll focused input into view (Android keyboard)
  useEffect(() => {
    if (!show) return;
    const el = bodyRef.current;
    if (!el) return;
    const handleFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) {
        setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 300);
      }
    };
    el.addEventListener('focusin', handleFocusIn);
    return () => el.removeEventListener('focusin', handleFocusIn);
  }, [show]);

  // Keep the modal backdrop anchored to the visual viewport so it stays above
  // the software keyboard on Android Chrome.
  useEffect(() => {
    if (!show) return;
    const update = () => {
      const vv = window.visualViewport;
      if (!backdropRef.current) return;
      const top = vv?.offsetTop ?? 0;
      const h = vv?.height ?? window.innerHeight;
      backdropRef.current.style.top = `${top}px`;
      backdropRef.current.style.height = `${h}px`;
    };
    update();
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener('resize', update); vv.addEventListener('scroll', update); }
    else { window.addEventListener('resize', update); }
    return () => {
      if (vv) { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); }
      else { window.removeEventListener('resize', update); }
    };
  }, [show]);

  if (!show) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-x-0 z-50 flex items-center justify-center p-4 bg-black/50"
      style={{ top: 0, height: '100vh' }}
      onClick={e => { if (e.target === e.currentTarget) onHide(); }}
    >
      <div
        className={`relative bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full flex flex-col animate-fadeIn`}
        style={{ maxHeight: 'calc(var(--viewport-height, 100vh) - 32px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — always visible */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onHide}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div ref={bodyRef} className="flex-1 overflow-auto min-h-0 p-6">
          {children}
        </div>

        {/* Footer — always visible */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
