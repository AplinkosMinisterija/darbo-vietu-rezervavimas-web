import styled, { css } from 'styled-components';

/**
 * Shared styled primitives for admin pages — table, pagination, badge,
 * search input, empty states. Atskirtas iš pages failų, kad neturėtume
 * 5× to paties styled-component'o.
 *
 * Table'as: thead navy + white, tbody alternuojantis (white / bg),
 * hover row highlight, compact md paddings, mobile = horizontal scroll
 * per `TableWrapper` (min-width: 720px).
 */

export const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
`;

export const PageTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.navy};
  font-size: 22px;
`;

export const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  font-size: 14px;
  min-width: 280px;
  background: ${({ theme }) => theme.colors.surface};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const THead = styled.thead`
  background: ${({ theme }) => theme.colors.navy};
  color: #fff;
`;

export const TBody = styled.tbody`
  & > tr:nth-child(even) {
    background: ${({ theme }) => theme.colors.bg};
  }
  & > tr:hover {
    background: #eef2f7;
  }
`;

export const TR = styled.tr``;

export const TH = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
`;

export const TD = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

export const PageButton = styled.button`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 13px;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const PageInfo = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

export const RoleBadge = styled.span<{ $role: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  ${({ $role, theme }) =>
    $role === 'ADMIN'
      ? css`
          background: ${theme.colors.navy};
          color: #fff;
        `
      : css`
          background: ${theme.colors.bg};
          color: ${theme.colors.text};
          border: 1px solid ${theme.colors.border};
        `}
`;

export const ActionBadge = styled.span`
  display: inline-block;
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 12px;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-family: monospace;
`;

export const LinkButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.brand};
  border: 1px solid ${({ theme }) => theme.colors.brand};
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 13px;
  text-decoration: none;
  display: inline-block;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.brand};
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const DangerLinkButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.danger};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 13px;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const EmptyState = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  color: ${({ theme }) => theme.colors.textMute};
  text-align: center;
`;

export const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 14px;
  margin: 0;
`;

export const FilterBar = styled.div`
  display: flex;
  align-items: end;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.ui.spacing.md};
  background: ${({ theme }) => theme.colors.bg};
  border-radius: ${({ theme }) => theme.ui.radius};
`;

export const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const FilterLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

export const FilterInput = styled.input`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

export const FilterSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;
