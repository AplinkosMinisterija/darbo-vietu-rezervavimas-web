import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
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
  Pagination,
  PageButton,
  PageInfo,
  RoleBadge,
  PageHeader,
  PageTitle,
  SearchInput,
  EmptyState,
  Muted,
  LinkButton,
} from './shared';

const PAGE_SIZE = 50;

/**
 * Admin'o vartotojų sąrašas. Search box debounce'as 300ms — kad
 * neapsiūtumėm BE'o po kiekvieno simbolio. Pagination'as `offset`-based,
 * 50 per page (atitinka BE default limit'ą).
 */
export default function AdminUsersPage() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<
    Array<{ id: string; email: string; displayName: string; role: string; allowedRoomIds?: string[] }>
  >([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedQ(q);
      setOffset(0);
    }, 300);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.users.list({
        q: debouncedQ || undefined,
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
  }, [debouncedQ, offset, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const hasResults = items.length > 0;

  const rows = useMemo(
    () =>
      items.map((u) => (
        <TR key={u.id}>
          <TD>{u.displayName || '—'}</TD>
          <TD>{u.email}</TD>
          <TD>
            <RoleBadge $role={u.role}>{u.role}</RoleBadge>
          </TD>
          <TD>{u.allowedRoomIds?.length ?? 0}</TD>
          <TD>
            <LinkButton as={Link} to={`/admin/users/${u.id}`}>
              Redaguoti
            </LinkButton>
          </TD>
        </TR>
      )),
    [items],
  );

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Vartotojai</PageTitle>
        <SearchInput
          type="search"
          placeholder="Ieškoti pagal vardą ar el. paštą…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </PageHeader>

      {isLoading && !hasResults ? (
        <Muted>Kraunama…</Muted>
      ) : !hasResults ? (
        <EmptyState>Nerasta vartotojų</EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  <TH>Vardas</TH>
                  <TH>El. paštas</TH>
                  <TH>Rolė</TH>
                  <TH>Patalpos</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>{rows}</TBody>
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

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;
