import { Link, NavLink } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../state/auth';

/**
 * Top nav bar — logo (placeholder text), kelios pagrindinės nuorodos,
 * user'io vardas + logout, ir admin link'as jei admin role. Phase 4-5
 * pridės real'ius nav items (Mano rezervacijos, Apžvalga).
 */
export default function NavBar() {
  const { user, isAdmin, logout } = useAuth();
  const isManager = !!user?.managedRoomIds && user.managedRoomIds.length > 0;

  return (
    <Bar>
      <Inner>
        <Brand to="/">Darbo vietų rezervavimas</Brand>

        <Nav>
          <StyledNavLink to="/" end>Pradžia</StyledNavLink>
          <StyledNavLink to="/mano">Mano rezervacijos</StyledNavLink>
          <StyledNavLink to="/apzvalga">Apžvalga</StyledNavLink>
          {isManager && <StyledNavLink to="/patalpu-administravimas">Patalpų administravimas</StyledNavLink>}
          {isAdmin && <StyledNavLink to="/admin">Administravimas</StyledNavLink>}
        </Nav>

        <UserBox>
          {user && <UserName>{user.displayName || user.email}</UserName>}
          <LogoutButton type="button" onClick={logout}>
            Atsijungti
          </LogoutButton>
        </UserBox>
      </Inner>
    </Bar>
  );
}

const Bar = styled.header`
  background: ${({ theme }) => theme.colors.navy};
  color: #fff;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.ui.spacing.lg};
  height: 60px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.lg};

  @media (max-width: 768px) {
    padding: 0 ${({ theme }) => theme.ui.spacing.md};
    gap: ${({ theme }) => theme.ui.spacing.sm};
    height: 56px;
  }
`;

const Brand = styled(Link)`
  color: #fff;
  font-weight: 600;
  font-size: 18px;
  text-decoration: none;
  white-space: nowrap;
  &:hover { text-decoration: none; }

  @media (max-width: 768px) {
    font-size: 15px;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    gap: ${({ theme }) => theme.ui.spacing.xs};
  }
`;

const StyledNavLink = styled(NavLink)`
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  padding: ${({ theme }) => `${theme.ui.spacing.xs} ${theme.ui.spacing.sm}`};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  white-space: nowrap;

  &:hover {
    color: #fff;
    text-decoration: none;
  }

  &.active {
    color: ${({ theme }) => theme.colors.brand};
    font-weight: 500;
  }

  @media (max-width: 768px) {
    font-size: 13px;
    padding: 4px 6px;
  }
`;

const UserBox = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-shrink: 0;

  @media (max-width: 768px) {
    gap: ${({ theme }) => theme.ui.spacing.xs};
  }
`;

const UserName = styled.span`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);

  @media (max-width: 768px) {
    display: none;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 13px;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;
