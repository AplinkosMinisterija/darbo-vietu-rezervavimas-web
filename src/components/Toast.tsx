import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styled, { keyframes } from 'styled-components';

/**
 * Toast'ai — paprastas global stack'as su `success` / `error` API. Auto-fade
 * po 3s. NE bazuotas ant 3rd-party library, kad nepridėtume bundle bagažo.
 */

type ToastKind = 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      counterRef.current += 1;
      const id = counterRef.current;
      setItems((curr) => [...curr, { id, kind, message }]);
      window.setTimeout(() => remove(id), 3000);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (msg: string) => push('success', msg),
      error: (msg: string) => push('error', msg),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Stack role="status" aria-live="polite">
        {items.map((t) => (
          <ToastBox key={t.id} $kind={t.kind} onClick={() => remove(t.id)}>
            {t.message}
          </ToastBox>
        ))}
      </Stack>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast turi būti naudojamas <ToastProvider> viduje');
  return ctx;
}

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Stack = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
`;

const ToastBox = styled.div<{ $kind: ToastKind }>`
  pointer-events: auto;
  min-width: 240px;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.ui.radius};
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: ${({ $kind, theme }) =>
    $kind === 'success' ? theme.colors.success : theme.colors.danger};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: ${slideIn} 0.18s ease-out;
`;
