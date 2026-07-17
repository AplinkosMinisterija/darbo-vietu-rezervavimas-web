import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import { useToast } from '../../components/Toast';
import { todayYmd } from '../../lib/dates';

type OccupancyPeriod = 'day' | 'week' | 'month';

const PERIOD_LABELS: Record<OccupancyPeriod, string> = {
  day: 'Diena',
  week: 'Savaitė',
  month: 'Mėnuo',
};

/**
 * Admin shell — sidebar (kairėje) + outlet (dešinėje). Sidebar links
 * placeholder'iai Phase 5 puslapiams. AppLayout (parent) jau pateikia
 * top nav bar'ą, tad čia tik vidinė admin srities navigacija.
 */
export default function AdminLayout() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [occPeriod, setOccPeriod] = useState<OccupancyPeriod>('month');
  const [occDate, setOccDate] = useState<string>(todayYmd());
  const [occExporting, setOccExporting] = useState(false);

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

  async function handleOccupancyExport() {
    if (occExporting) return;
    setOccExporting(true);
    try {
      await adminApi.export.downloadOccupancyXlsx(occPeriod, occDate);
      toast.success('Užimtumo ataskaita atsisiųsta');
    } catch {
      toast.error('Nepavyko eksportuoti užimtumo');
    } finally {
      setOccExporting(false);
    }
  }

  return (
    <Wrapper>
      <Sidebar>
        <SidebarTitle>Administravimas</SidebarTitle>
        <SidebarLink to="/admin/users">Vartotojai</SidebarLink>
        <SidebarLink to="/admin/rooms">Patalpos</SidebarLink>
        <SidebarLink to="/admin/reservations">Rezervacijos</SidebarLink>
        <SidebarLink to="/admin/statistika">Statistika</SidebarLink>
        <SidebarLink to="/admin/audit">Audit log</SidebarLink>
        <SidebarLink to="/admin/integracija">Integracijos</SidebarLink>
        <SidebarLink to="/admin/vadovai">Vadovai</SidebarLink>
        <ExportButton type="button" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Eksportuojama…' : 'Eksportuoti (Excel)'}
        </ExportButton>

        <OccupancyBox>
          <OccupancyTitle>Užimtumo eksportas</OccupancyTitle>
          <OccupancyField>
            <label htmlFor="occ-period">Periodas</label>
            <select
              id="occ-period"
              value={occPeriod}
              onChange={(e) => setOccPeriod(e.target.value as OccupancyPeriod)}
            >
              {(Object.keys(PERIOD_LABELS) as OccupancyPeriod[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </option>
              ))}
            </select>
          </OccupancyField>
          <OccupancyField>
            <label htmlFor="occ-date">
              {occPeriod === 'day'
                ? 'Data'
                : occPeriod === 'week'
                  ? 'Data (savaitėje)'
                  : 'Data (mėnesyje)'}
            </label>
            <input
              id="occ-date"
              type="date"
              value={occDate}
              onChange={(e) => setOccDate(e.target.value)}
            />
          </OccupancyField>
          <ExportButton
            type="button"
            onClick={handleOccupancyExport}
            disabled={occExporting || !occDate}
          >
            {occExporting ? 'Eksportuojama…' : 'Eksportuoti užimtumą'}
          </ExportButton>
        </OccupancyBox>
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

const OccupancyBox = styled.div`
  margin-top: ${({ theme }) => theme.ui.spacing.md};
  padding-top: ${({ theme }) => theme.ui.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};

  @media (max-width: 768px) {
    margin-top: 0;
    padding-top: 0;
    border-top: none;
    flex-direction: row;
    align-items: flex-end;
    flex-shrink: 0;
    gap: ${({ theme }) => theme.ui.spacing.xs};
  }
`;

const OccupancyTitle = styled.h3`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMute};

  @media (max-width: 768px) {
    display: none;
  }
`;

const OccupancyField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.textMute};
  }

  select,
  input {
    padding: ${({ theme }) => `${theme.ui.spacing.xs} ${theme.ui.spacing.sm}`};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.ui.radiusSm};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: 14px;
  }

  @media (max-width: 768px) {
    label {
      display: none;
    }
    select,
    input {
      font-size: 13px;
      padding: 6px 8px;
    }
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
