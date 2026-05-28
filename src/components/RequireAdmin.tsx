import type { ReactNode } from 'react';
import styled from 'styled-components';
import { useAuth } from '../state/auth';

/**
 * Admin role gate'as. Reikia būti jau autentikuotam (parent'as paprastai bus
 * `<RequireAuth>`) — jei ne admin, rodom 403 LT'iškai be naviguojant.
 */
export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <Wrapper>
        <h1>403</h1>
        <p>Tu neturi prieigos prie šio puslapio.</p>
        <a href="/">Grįžti į pradžią</a>
      </Wrapper>
    );
  }

  return <>{children}</>;
}

const Wrapper = styled.div`
  max-width: 480px;
  margin: 80px auto;
  padding: ${({ theme }) => theme.ui.spacing.xl};
  text-align: center;

  h1 {
    font-size: 48px;
    color: ${({ theme }) => theme.colors.danger};
    margin-bottom: ${({ theme }) => theme.ui.spacing.md};
  }

  p {
    color: ${({ theme }) => theme.colors.textMute};
    margin-bottom: ${({ theme }) => theme.ui.spacing.lg};
  }
`;
