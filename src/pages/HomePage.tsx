import styled from 'styled-components';
import { useAuth } from '../state/auth';

/**
 * Placeholder home page Phase 1-iui. Phase 4 čia atsiras:
 *   - WeekStrip (savaitės juosta)
 *   - MyRoomBanner (savo kabineto info)
 *   - RoomGrid (aukšto kortelės)
 */
export default function HomePage() {
  const { user } = useAuth();

  return (
    <Wrapper>
      <h1>Sveiki, {user?.displayName || user?.email}! 👋</h1>
      <Note>
        🚧 Phase 4 — čia bus rezervacijų UI (savaitės juosta, kabineto grid'as, stalų
        rezervavimas). Šiuo metu tik scaffold'as.
      </Note>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  h1 {
    margin-bottom: ${({ theme }) => theme.ui.spacing.md};
    color: ${({ theme }) => theme.colors.navy};
  }
`;

const Note = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  color: ${({ theme }) => theme.colors.textMute};
`;
