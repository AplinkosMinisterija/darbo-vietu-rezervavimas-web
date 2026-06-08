import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import { useToast } from '../../components/Toast';

/**
 * Admin shell — sidebar (kairėje) + outlet (dešinėje). Sidebar links
 * placeholder'iai Phase 5 puslapiams. AppLayout (parent) jau pateikia
 * top nav bar'ą, tad čia tik vidinė admin srities navigacija.
 */
export default function AdminLayout() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await adminApi.export.downloadXlsx();
      toast.success('Eksportas atsisiųstas');
    } catch {
      toast.error('Nepavyko eksportuoti duomenų');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Wrapper>
      <Sidebar>
        <SidebarTitle>Administravimas</SidebarTitle>
        <SidebarLink to="/admin/users">Vartotojai</SidebarLink>
        <SidebarLink to="/admin/rooms">Patalpos</SidebarLink>
        <SidebarLink to="/admin/reservations">Rezervacijos</SidebarLink>
        <SidebarLink to="/admin/audit">Audit log</SidebarLink>
        <ExportButton type="button" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Eksportuojama…' : 'Eksportuoti (Excel)'}
        </ExportButton>
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

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.ui.spacing.md};
  }
`;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.xs};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
    padding: ${({ theme }) => theme.ui.spacing.sm};
    gap: ${({ theme }) => theme.ui.spacing.xs};
  }
`;

const SidebarTitle = styled.h3`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMute};
  margin-bottom: ${({ theme }) => theme.ui.spacing.sm};

  @media (max-width: 768px) {
    display: none;
  }
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

  @media (max-width: 768px) {
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 13px;
    padding: 8px 12px;
  }
`;

const ExportButton = styled.button`
  margin-top: ${({ theme }) => theme.ui.spacing.md};
  padding: ${({ theme }) => `${theme.ui.spacing.sm} ${theme.ui.spacing.md}`};
  border: 1px solid ${({ theme }) => theme.colors.brand};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  background: ${({ theme }) => theme.colors.brand};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    margin-top: 0;
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 13px;
    padding: 8px 12px;
  }
`;

const Content = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.lg};
  min-height: 400px;
  min-width: 0;

  @media (max-width: 768px) {
    padding: ${({ theme }) => theme.ui.spacing.md};
  }
`;
