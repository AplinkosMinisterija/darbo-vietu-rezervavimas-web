import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type AuditEntry } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableWrapper,
  PageHeader,
  PageTitle,
  EmptyState,
  Muted,
  Pagination,
  PageButton,
  PageInfo,
  FilterBar,
  FilterGroup,
  FilterLabel,
  FilterSelect,
  ActionBadge,
} from './shared';

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  'RESERVE',
  'CANCEL',
  'ADMIN_ASSIGN_ROOM',
  'ADMIN_SET_ROLE',
  'ADMIN_CREATE_ROOM',
  'ADMIN_UPDATE_ROOM',
  'ADMIN_DELETE_ROOM',
  'ADMIN_CANCEL_RESERVATION',
];

/**
 * Audit log peržiūra — read-only. Filter'iai pagal action type'ą.
 * Payload'as rodomas collapsible'iu (expand'inant <details>) JSON
 * pretty-print'as. user=NULL → „Sistema" žinutė (pvz. CRON migration'ai).
 */
export default function AdminAuditPage() {
  const toast = useToast();
  const [action, setAction] = useState('');
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.audit.list({
        action: action || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [action, offset, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [action]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Audit log</PageTitle>
      </PageHeader>

      <FilterBar>
        <FilterGroup>
          <FilterLabel>Veiksmas</FilterLabel>
          <FilterSelect value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Visi</option>
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FilterBar>

      {isLoading && items.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : items.length === 0 ? (
        <EmptyState>Įrašų nerasta</EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  <TH>Laikas</TH>
                  <TH>Vartotojas</TH>
                  <TH>Veiksmas</TH>
                  <TH>Detalės</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((entry) => (
                  <TR key={entry.id}>
                    <TD>{formatTimestamp(entry.createdAt)}</TD>
                    <TD>{entry.user?.displayName ?? 'Sistema'}</TD>
                    <TD>
                      <ActionBadge>{entry.action}</ActionBadge>
                    </TD>
                    <TD>
                      {entry.payload && Object.keys(entry.payload).length > 0 ? (
                        <Details>
                          <summary>Žiūrėti</summary>
                          <Pre>{JSON.stringify(entry.payload, null, 2)}</Pre>
                        </Details>
                      ) : (
                        <DimText>—</DimText>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrapper>

          <Pagination>
            <PageButton
              type="button"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0 || isLoading}
            >
              Ankstesnis
            </PageButton>
            <PageInfo>
              {currentPage} / {totalPages} ({total})
            </PageInfo>
            <PageButton
              type="button"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || isLoading}
            >
              Kitas
            </PageButton>
          </Pagination>
        </>
      )}
    </Wrapper>
  );
}

const MONTHS_LT = [
  'sausio',
  'vasario',
  'kovo',
  'balandžio',
  'gegužės',
  'birželio',
  'liepos',
  'rugpjūčio',
  'rugsėjo',
  'spalio',
  'lapkričio',
  'gruodžio',
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dayMonthYear = `${d.getDate()} ${MONTHS_LT[d.getMonth()]} ${d.getFullYear()}`;
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${dayMonthYear} ${hm}`;
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Details = styled.details`
  summary {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.brand};
    font-size: 13px;
  }
`;

const Pre = styled.pre`
  margin: 6px 0 0 0;
  padding: 8px;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 480px;
`;

const DimText = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 13px;
`;
