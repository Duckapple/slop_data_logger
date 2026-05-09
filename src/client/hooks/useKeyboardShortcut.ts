import { useEffect } from 'react';

export type Shortcut = {
  key: string; // single char like "n", "/", "?", or sequence "g d"
  description: string;
  handler: (e: KeyboardEvent) => void;
};

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return t.isContentEditable;
}

export function useKeyboardShortcut(shortcuts: Shortcut[]): void {
  useEffect(() => {
    let pending: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const clearPending = () => {
      pending = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    };

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const m = shortcuts.find((s) => s.key === 'Escape');
        if (m) {
          m.handler(e);
        }
        clearPending();
        return;
      }

      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key;
      const seqKey = pending ? `${pending} ${k}` : null;

      if (seqKey) {
        const seqMatch = shortcuts.find((s) => s.key === seqKey);
        if (seqMatch) {
          e.preventDefault();
          seqMatch.handler(e);
          clearPending();
          return;
        }
        clearPending();
      }

      const startsSequence = shortcuts.some((s) => s.key.startsWith(`${k} `));
      if (startsSequence) {
        pending = k;
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(clearPending, 1000);
        return;
      }

      const single = shortcuts.find((s) => s.key === k);
      if (single) {
        e.preventDefault();
        single.handler(e);
        clearPending();
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (pendingTimer) clearTimeout(pendingTimer);
    };
  }, [shortcuts]);
}
