import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@hooks/useRedux';
import { addNotification } from '@store/slices/uiSlice';
import { CustomerSession, createEmptySession } from './posSession.types';

export const POS_DRAFT_KEY_PREFIX = 'shopflow_pos_draft_';
const SAVE_DEBOUNCE_MS = 800;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // discard drafts older than 24h — prices/stock may be stale

interface Draft {
  sessions: CustomerSession[];
  activeSessionId: string;
  timestamp: string;
}

const hasContent = (sessions: CustomerSession[]): boolean =>
  sessions.some(
    (s) =>
      s.cart.items.length > 0 ||
      s.cart.customer_id != null ||
      s.currentCustomerObj != null ||
      s.guestName.trim() !== '' ||
      s.guestPhone.trim() !== '',
  );

interface UsePosSessionDraftArgs {
  userId: number | string | null | undefined;
  sessions: CustomerSession[];
  setSessions: React.Dispatch<React.SetStateAction<CustomerSession[]>>;
  activeSessionId: string;
  setActiveSessionId: React.Dispatch<React.SetStateAction<string>>;
}

export const usePosSessionDraft = ({
  userId,
  sessions,
  setSessions,
  activeSessionId,
  setActiveSessionId,
}: UsePosSessionDraftArgs) => {
  const dispatch = useAppDispatch();
  const key = userId != null ? `${POS_DRAFT_KEY_PREFIX}${userId}` : null;
  const soldSessionIds = useRef<Set<string>>(new Set());

  // Restore draft on mount — ref guard prevents double-fire in React StrictMode
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftLoaded.current || !key) return;
    draftLoaded.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (!parsed || !Array.isArray(parsed.sessions) || parsed.sessions.length === 0) return;
      if (Date.now() - new Date(parsed.timestamp).getTime() > MAX_AGE_MS) {
        localStorage.removeItem(key);
        return;
      }
      if (!hasContent(parsed.sessions)) return;

      setSessions(parsed.sessions);
      const stillExists = parsed.sessions.some((s) => s.id === parsed.activeSessionId);
      setActiveSessionId(stillExists ? parsed.activeSessionId : parsed.sessions[0].id);

      const formatted = new Date(parsed.timestamp).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      dispatch(addNotification({ message: `Restored unfinished sale from ${formatted}`, type: 'info', duration: 5000 }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Auto-save draft, debounced — only when there's meaningful content
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!key) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const toPersist = sessions.map((s) =>
        soldSessionIds.current.has(s.id) ? { ...s, cart: createEmptySession(0).cart } : s,
      );
      if (hasContent(toPersist)) {
        localStorage.setItem(
          key,
          JSON.stringify({ sessions: toPersist, activeSessionId, timestamp: new Date().toISOString() }),
        );
      } else {
        localStorage.removeItem(key);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimer.current);
  }, [sessions, activeSessionId, key]);

  const markSessionSold = (sessionId: string) => {
    soldSessionIds.current.add(sessionId);
    if (!key) return;
    const toPersist = sessions.map((s) =>
      s.id === sessionId ? { ...s, cart: createEmptySession(0).cart } : s,
    );
    if (hasContent(toPersist)) {
      localStorage.setItem(
        key,
        JSON.stringify({ sessions: toPersist, activeSessionId, timestamp: new Date().toISOString() }),
      );
    } else {
      localStorage.removeItem(key);
    }
  };

  return { markSessionSold };
};
