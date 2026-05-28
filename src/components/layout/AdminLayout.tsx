import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';

/**
 * Admin shell — sidebar (kairėje) + outlet (dešinėje). Sidebar links
 * placeholder'iai Phase 5 puslapiams. AppLayout (parent) jau pateikia
 * top nav bar'ą, tad čia tik vidinė admin srities navigacija.
 */
export default function AdminLayout() {
  return (
    <Wrapper>
      <Sidebar>
        <SidebarTitle>Administravimas</SidebarTitle>
        <SidebarLink to="/admin/users">Vartotojai</SidebarLink>
        <SidebarLink to="/admin/rooms">Patalpos</SidebarLink>
        <SidebarLink to="/admin/reservations">Rezervacijos</SidebarLink>
        <SidebarLink to="/admin/audit">Audit log</SidebarLink>
      </Sidebar>
      <Content>
        <Outlet />
      </Content>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: ${({ theme }) => theme.ui.spacing.lg};
  align-items: start;
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.xs};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
`;

const SidebarTitle = styled.h3`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMute};
  margin-bottom: ${({ theme }) => theme.ui.spacing.sm};
`;

const SidebarLink = styled(NavLink)`
  display: block;
  padding: ${({ theme }) => `${theme.ui.spacing.sm} ${theme.ui.spacing.md}`};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-size: 14px;

  &:hover {
    background: ${({ theme }) => theme.colors.bg};
    text-decoration: none;
  }

  &.active {
    background: ${({ theme }) => theme.colors.brand};
    color: #fff;
  }
`;

const Content = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.lg};
  min-height: 400px;
`;
