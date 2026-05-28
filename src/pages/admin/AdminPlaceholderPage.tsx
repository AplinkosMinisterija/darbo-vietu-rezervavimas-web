import styled from 'styled-components';

/**
 * Placeholder visiems admin sub-route'ams Phase 1-iui. Phase 5 pakeis
 * į real'ius puslapius (AdminUsersPage, AdminRoomsPage, ir t.t.).
 */
export default function AdminPlaceholderPage() {
  return (
    <Wrapper>
      <h2>🚧 Admin Phase 5</h2>
      <p>Čia atsiras vartotojų, patalpų, rezervacijų ir audit log valdymas.</p>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  h2 {
    margin-bottom: ${({ theme }) => theme.ui.spacing.md};
    color: ${({ theme }) => theme.colors.navy};
  }
  p {
    color: ${({ theme }) => theme.colors.textMute};
  }
`;
