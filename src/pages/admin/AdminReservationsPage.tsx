import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
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
  SHARED_FILTER_OPTIONS,
  compareRooms,
  filterRooms,
  roomFloors,
  type RoomSharedFilter,
} from '../../lib/roomFilter';
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
 * aukštas, „Bendra?", patalpos dropdown). User paieška debounce'inama 300ms ir resolve'inama į
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
  const [floor, setFloor] = useState<number | null>(null);
  const [shared, setShared] = useState<RoomSharedFilter>('all');
  const [offset, setOffset] = useState(0);

  const dateFromId = useId();
  const dateToId = useId();
  const userQueryId = useId();
  const floorId = useId();
  const sharedId = useId();
  const roomSelectId = useId();

  const [items, setItems] = useState<AdminReservation[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<AdminReservation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

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
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    try {
      const data = await adminApi.reservations.listAll({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userId: resolvedUserId,
        roomId: roomId || undefined,
        floor: floor ?? undefined,
        shared: shared === 'all' ? undefined : shared === 'shared',
        limit: PAGE_SIZE,
        offset,
      });
      // Vėluojantis ankstesnio filtro atsakymas neturi perrašyti naujesnio.
      if (seq !== requestSeqRef.current) return;
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      if (seq === requestSeqRef.current) toast.error(adminErrorMessage(err));
    } finally {
      if (seq === requestSeqRef.current) setIsLoading(false);
    }
  }, [dateFrom, dateTo, resolvedUserId, roomId, floor, shared, offset, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  // Resetuojam offset kai filter pasikeičia (išskyrus userQuery — jį tvarko debounce)
  useEffect(() => {
    setOffset(0);
  }, [dateFrom, dateTo, roomId, resolvedUserId]);

  /**
   * Aukštas/„Bendra?" siaurina ir patalpų sąrašą, todėl pasirinkta patalpa
   * gali iš jo iškristi. Išvalom ją kartu su filtru viename state atnaujinime —
   * kitaip tarpinis renderis paleistų prieštaringą užklausą (roomId iš kito aukšto).
   */
  function applyRoomScope(next: { floor?: number | null; shared?: RoomSharedFilter }) {
    const nextFloor = next.floor !== undefined ? next.floor : floor;
    const nextShared = next.shared !== undefined ? next.shared : shared;
    const stillVisible =
      roomId &&
      filterRooms(rooms, { query: '', floor: nextFloor, shared: nextShared }).some(
        (r) => r.id === roomId,
      );
    if (next.floor !== undefined) setFloor(next.floor);
    if (next.shared !== undefined) setShared(next.shared);
    if (roomId && !stillVisible) setRoomId('');
    setOffset(0);
  }

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

  const floors = useMemo(() => roomFloors(rooms), [rooms]);

  const sortedRooms = useMemo(
    () => filterRooms(rooms, { query: '', floor, shared }).sort(compareRooms),
    [rooms, floor, shared],
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
          <FilterLabel htmlFor={dateFromId}>Data nuo</FilterLabel>
          <FilterInput
            id={dateFromId}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={dateToId}>Data iki</FilterLabel>
          <FilterInput
            id={dateToId}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={userQueryId}>Vartotojas</FilterLabel>
          <FilterInput
            id={userQueryId}
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
          <FilterLabel htmlFor={floorId}>Aukštas</FilterLabel>
          <FilterSelect
            id={floorId}
            value={floor === null ? '' : String(floor)}
            onChange={(e) =>
              applyRoomScope({ floor: e.target.value === '' ? null : Number(e.target.value) })
            }
          >
            <option value="">Visi</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                {f} a.
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={sharedId}>Bendra?</FilterLabel>
          <FilterSelect
            id={sharedId}
            value={shared}
            onChange={(e) => applyRoomScope({ shared: e.target.value as RoomSharedFilter })}
          >
            {SHARED_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={roomSelectId}>Patalpa</FilterLabel>
          <FilterSelect id={roomSelectId} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
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
