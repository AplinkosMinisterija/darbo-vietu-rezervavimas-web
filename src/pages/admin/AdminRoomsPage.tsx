import { useId, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import { useRooms } from '../../state/rooms';
import Modal, { DangerButton, PrimaryButton, SecondaryButton } from '../../components/Modal';
import CreateRoomModal from '../../components/admin/CreateRoomModal';
import EditRoomModal from '../../components/admin/EditRoomModal';
import {
  EMPTY_ROOM_FILTER,
  filterRooms,
  type RoomFilter,
  type RoomSharedFilter,
} from '../../lib/roomFilter';
import type { Room } from '../../types';
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
  LinkButton,
  DangerLinkButton,
  FilterBar,
  FilterGroup,
  FilterLabel,
  FilterInput,
  FilterSelect,
} from './shared';

/**
 * Patalpų lentelė per aukštus. Inline edit'as deskCount'ui (click number →
 * input → Enter ar blur → PUT). Delete confirmation modal'as su konkrečia
 * error mapping'ą (409 ROOM_HAS_FUTURE_RESERVATIONS → LT žinutė).
 */
export default function AdminRoomsPage() {
  const toast = useToast();
  const { rooms, isLoading, refetch } = useRooms();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingDesk, setEditingDesk] = useState<string | null>(null);
  const [deskInput, setDeskInput] = useState<number>(0);
  const [savingDesk, setSavingDesk] = useState(false);
  const [editingShared, setEditingShared] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoomFilter>(EMPTY_ROOM_FILTER);

  const searchId = useId();
  const floorId = useId();
  const sharedId = useId();

  // Aukštų sąrašas imamas iš VISŲ patalpų, kad pasirinkus aukštą pats
  // pasirinkimas neišnyktų iš dropdown'o.
  const floors = useMemo(
    () => Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b),
    [rooms],
  );

  const visibleRooms = useMemo(() => filterRooms(rooms, filter), [rooms, filter]);

  const grouped = useMemo(() => {
    const map = new Map<number, Room[]>();
    for (const r of visibleRooms) {
      const list = map.get(r.floor) ?? [];
      list.push(r);
      map.set(r.floor, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.number.localeCompare(b.number, 'lt', { numeric: true }));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [visibleRooms]);

  function startEditDesk(r: Room) {
    setEditingDesk(r.id);
    setDeskInput(r.deskCount);
  }

  async function commitDesk(r: Room) {
    if (deskInput === r.deskCount) {
      setEditingDesk(null);
      return;
    }
    if (deskInput < 0 || !Number.isInteger(deskInput)) {
      toast.error('Darbo vietų skaičius turi būti ≥ 0');
      return;
    }
    setSavingDesk(true);
    try {
      await adminApi.rooms.update(r.id, { deskCount: deskInput });
      toast.success('Darbo vietų skaičius atnaujintas');
      await refetch();
      setEditingDesk(null);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSavingDesk(false);
    }
  }

  async function toggleShared(r: Room) {
    setEditingShared(r.id);
    try {
      await adminApi.rooms.update(r.id, { isShared: !r.isShared });
      toast.success('Patalpa atnaujinta');
      await refetch();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setEditingShared(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.rooms.remove(deleteTarget.id);
      toast.success('Patalpa ištrinta');
      await refetch();
      setDeleteTarget(null);
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Patalpos</PageTitle>
        <PrimaryButton type="button" onClick={() => setCreateOpen(true)}>
          + Pridėti patalpą
        </PrimaryButton>
      </PageHeader>

      <FilterBar>
        <FilterGroup>
          <FilterLabel htmlFor={searchId}>Paieška</FilterLabel>
          <FilterInput
            id={searchId}
            type="search"
            placeholder="numeris ar pavadinimas"
            value={filter.query}
            onChange={(e) => setFilter({ ...filter, query: e.target.value })}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={floorId}>Aukštas</FilterLabel>
          <FilterSelect
            id={floorId}
            value={filter.floor === null ? '' : String(filter.floor)}
            onChange={(e) =>
              setFilter({
                ...filter,
                floor: e.target.value === '' ? null : Number(e.target.value),
              })
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
            value={filter.shared}
            onChange={(e) =>
              setFilter({ ...filter, shared: e.target.value as RoomSharedFilter })
            }
          >
            <option value="all">Visos</option>
            <option value="shared">Tik bendros</option>
            <option value="private">Tik nebendros</option>
          </FilterSelect>
        </FilterGroup>
      </FilterBar>

      {isLoading && rooms.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : rooms.length === 0 ? (
        <EmptyState>Patalpų sąraše dar nieko nėra. Pradėk pridėjant pirmąją.</EmptyState>
      ) : visibleRooms.length === 0 ? (
        <EmptyState>Pagal filtrą patalpų nerasta.</EmptyState>
      ) : (
        grouped.map(([floor, list]) => (
          <FloorSection key={floor}>
            <FloorHeader>{floor} aukštas</FloorHeader>
            <TableWrapper>
              <Table>
                <THead>
                  <TR>
                    <TH>Numeris</TH>
                    <TH>Pavadinimas</TH>
                    <TH>Darbo vietų</TH>
                    <TH>Bendra?</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {list.map((r) => (
                    <TR key={r.id}>
                      <TD>{r.number}</TD>
                      <TD>{r.name || '—'}</TD>
                      <TD>
                        {editingDesk === r.id ? (
                          <InlineEdit>
                            <InlineInput
                              type="number"
                              min={0}
                              value={deskInput}
                              autoFocus
                              onChange={(e) => setDeskInput(Number(e.target.value))}
                              onBlur={() => void commitDesk(r)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void commitDesk(r);
                                else if (e.key === 'Escape') setEditingDesk(null);
                              }}
                              disabled={savingDesk}
                            />
                          </InlineEdit>
                        ) : (
                          <DeskNumber
                            type="button"
                            onClick={() => startEditDesk(r)}
                            title="Spausk redaguoti"
                          >
                            {r.deskCount}
                          </DeskNumber>
                        )}
                      </TD>
                      <TD>
                        <SharedToggle
                          type="button"
                          onClick={() => void toggleShared(r)}
                          disabled={editingShared === r.id}
                          $on={r.isShared}
                        >
                          {r.isShared ? 'Taip' : 'Ne'}
                        </SharedToggle>
                      </TD>
                      <TD>
                        <RowActions>
                          <LinkButton type="button" onClick={() => setEditTarget(r)}>
                            Redaguoti
                          </LinkButton>
                          <DangerLinkButton
                            type="button"
                            onClick={() => setDeleteTarget(r)}
                          >
                            Trinti
                          </DangerLinkButton>
                        </RowActions>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrapper>
          </FloorSection>
        ))
      )}

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => void refetch()}
      />

      <EditRoomModal
        open={editTarget !== null}
        room={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => void refetch()}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        title="Ištrinti patalpą?"
        footer={
          <>
            <SecondaryButton
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Atšaukti
            </SecondaryButton>
            <DangerButton type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Trinama…' : 'Ištrinti'}
            </DangerButton>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Ar tikrai nori ištrinti patalpą{' '}
            <b>
              {deleteTarget.number}
              {deleteTarget.name ? ` · ${deleteTarget.name}` : ''}
            </b>
            ? Šis veiksmas negrįžtamas. (Jei yra būsimų rezervacijų — BE atmesa
            su klaida; pirma atšauk rezervacijas.)
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

const FloorSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const FloorHeader = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.navy};
`;

const RowActions = styled.div`
  display: inline-flex;
  gap: 8px;
  align-items: center;
`;

const DeskNumber = styled.button`
  background: transparent;
  border: 1px dashed transparent;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  &:hover {
    border-color: ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.bg};
  }
`;

const InlineEdit = styled.div`
  display: inline-flex;
`;

const InlineInput = styled.input`
  width: 72px;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.brand};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
`;

const SharedToggle = styled.button<{ $on: boolean }>`
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid
    ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.border)};
  background: ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.surface)};
  color: ${({ $on, theme }) => ($on ? '#fff' : theme.colors.text)};
  &:disabled {
    opacity: 0.5;
  }
`;
