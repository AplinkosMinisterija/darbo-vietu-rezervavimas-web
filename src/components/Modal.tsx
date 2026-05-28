import { useEffect, type ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Bendras modal scaffolding'as — backdrop click + Esc closes. Komponentai
 * ReserveModal/CancelModal naudoja vidų savo flow'ams.
 */
export default function Modal({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Backdrop onClick={onClose}>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <Title>{title}</Title>
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Panel>
    </Backdrop>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 9500;
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.ui.radius};
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  width: min(440px, 100%);
  padding: ${({ theme }) => theme.ui.spacing.lg};
`;

const Title = styled.h3`
  margin: 0 0 ${({ theme }) => theme.ui.spacing.md} 0;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.navy};
`;

const Body = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
`;

const Footer = styled.div`
  margin-top: ${({ theme }) => theme.ui.spacing.lg};
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  justify-content: flex-end;
`;

export const PrimaryButton = styled.button`
  background: ${({ theme }) => theme.colors.brand};
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-size: 14px;
  font-weight: 500;
  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
`;

export const DangerButton = styled.button`
  background: ${({ theme }) => theme.colors.danger};
  color: #fff;
  border: none;
  padding: 10px 18px;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-size: 14px;
  font-weight: 500;
  &:hover:not(:disabled) {
    filter: brightness(1.05);
  }
`;

export const SecondaryButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 10px 18px;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-size: 14px;
  font-weight: 500;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg};
  }
`;
