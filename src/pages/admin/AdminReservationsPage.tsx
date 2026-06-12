import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type AdminReservation } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { reservationErrorMessage } from '../../lib/errorMessages';
import { useToast } from '../../components/Toast';
import { useRooms } from '../../state/rooms';
import Modal, { DangerButton, PrimaryButton, SecondaryButton } from '../../components/Modal';
import AssignReservationModal from '../../components/admin/AssignReservationModal';
import { humanDate } from '../../lib/dates';
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
  FilterInput,
  FilterSelect,
  DangerLinkButton,
} from './shared';

const PAGE_SIZE = 50;

/**
 * Visų rezervacijų sąrašas su filtrais (data nuo/iki, user'io paieška,
 * patalpos dropdown). User paieška debounce'inama 300ms ir resolve'inama į
 * `userId` per /api/users?q=... lookup'ą — pirmas rezultatas, kad UI
 * būtų paprastas (ne combobox dropdown'as).
 *
 * Atšaukimas eina per `/api/reservations/:id` DELETE — BE pagal admin
 * role'ę leis bet kurią ne praėjusią atšaukti.
 */
export default function AdminReservationsPage() {
  const toast = useToast();
  const { rooms } = useRooms();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [debouncedUserQuery, setDebouncedUserQuery] = useState('');
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(undefined);
  const [roomId, setRoomId] = useState('');
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState<AdminReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<AdminReservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedUserQuery(userQuery.trim());
      setOffset(0);
    }, 300);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [userQuery]);

  // Resolve user query → userId (pirmas hit'as iš /users)
  useEffect(() => {
    let active = true;
    if (!debouncedUserQuery) {
      setResolvedUserId(undefined);
      return;
    }
    void (async () => {
      try {
        const r = await adminApi.users.list({ q: debouncedUserQuery, limit: 1 });
        if (!active) return;
        setResolvedUserId(r.items[0]?.id);
      } catch {
        if (active) setResolvedUserId(undefined);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedUserQuery]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.reservations.listAll({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userId: resolvedUserId,
        roomId: roomId || undefined,
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
  }, [dateFrom, dateTo, resolvedUserId, roomId, offset, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resetuojam offset kai filter pasikeičia (išskyrus userQuery — jį tvarko debounce)
  useEffect(() => {
    setOffset(0);
  }, [dateFrom, dateTo, roomId, resolvedUserId]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await adminApi.reservations.cancel(cancelTarget.id);
      toast.success('Rezervacija atšaukta');
      setCancelTarget(null);
      await load();
    } catch (err) {
      // CANNOT_CANCEL_PAST iš reservations error space'o — reuse'iname tą lookup'ą
      toast.error(reservationErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number)),
    [rooms],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Rezervacijos</PageTitle>
        <PrimaryButton type="button" onClick={() => setAssignOpen(true)}>
          + Priskirti rezervaciją
        </PrimaryButton>
      </PageHeader>

      <FilterBar>
        <FilterGroup>
          <FilterLabel>Data nuo</FilterLabel>
          <FilterInput
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Data iki</FilterLabel>
          <FilterInput
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Vartotojas</FilterLabel>
          <FilterInput
            type="search"
            placeholder="vardas ar el. paštas"
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
          />
          {debouncedUserQuery && !resolvedUserId && (
            <Hint>Nieks nerasta</Hint>
          )}
        </FilterGroup>
        <FilterGroup>
          <FilterLabel>Patalpa</FilterLabel>
          <FilterSelect value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Visos</option>
            {sortedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.floor} a. · {r.number}
                {r.name ? ` · ${r.name}` : ''}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
      </FilterBar>

      {isLoading && items.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : items.length === 0 ? (
        <EmptyState>Pagal filtrus rezervacijų nerasta</EmptyState>
      ) : (
        <>
          <TableWrapper>
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Kabinetas</TH>
                  <TH>Vieta</TH>
                  <TH>Vartotojas</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {items.map((r) => (
                  <TR key={r.id}>
                    <TD>{humanDate(r.date)}</TD>
                    <TD>
                      {r.room.number}
                      {r.room.name ? ` · ${r.room.name}` : ''}
                    </TD>
                    <TD>{r.deskNumber}</TD>
                    <TD>{r.user?.displayName ?? '—'}</TD>
                    <TD>
                      <DangerLinkButton
                        type="button"
                        onClick={() => setCancelTarget(r)}
                      >
                        Atšaukti
                      </DangerLinkButton>
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

      <AssignReservationModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSuccess={() => void load()}
      />

      <Modal
        open={cancelTarget !== null}
        onClose={() => (cancelling ? undefined : setCancelTarget(null))}
        title="Atšaukti rezervaciją?"
        footer={
          <>
            <SecondaryButton
              type="button"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Uždaryti
            </SecondaryButton>
            <DangerButton type="button" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Atšaukiama…' : 'Atšaukti'}
            </DangerButton>
          </>
        }
      >
        {cancelTarget && (
          <p>
            Ar tikrai nori atšaukti rezervaciją{' '}
            <b>
              {cancelTarget.room.number} · vieta {cancelTarget.deskNumber} ·{' '}
              {humanDate(cancelTarget.date)}
            </b>{' '}
            (vartotojas: {cancelTarget.user?.displayName ?? '—'})?
          </p>
        )}
      </Modal>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Hint = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.warning};
`;
