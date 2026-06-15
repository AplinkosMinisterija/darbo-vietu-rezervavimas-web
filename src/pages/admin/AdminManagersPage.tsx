import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { adminApi, type RoomManagerRow } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import { useRooms } from '../../state/rooms';
import Modal, { DangerButton, PrimaryButton, SecondaryButton } from '../../components/Modal';
import UserSearchPicker from '../../components/admin/UserSearchPicker';
import type { User } from '../../types';
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
  DangerLinkButton,
  FilterSelect,
} from './shared';

/**
 * Patalpų vadovų administravimas. Trys blokai:
 *  - Sinchronizacijos kortelė: jungiklis (auto-priskyrimo cron'as įjungtas /
 *    išjungtas, kas mėnesį iš AM puslapio) + „Sinchronizuoti dabar" mygtukas.
 *  - „Priskirti vadovą" modal'as: patalpa + vartotojo paieška → rankinis
 *    vadovas (source='manual').
 *  - Lentelė su visais vadovais, grupuota per patalpas, source badge'ai
 *    (auto / manual), trinti su confirm modal'u.
 */
export default function AdminManagersPage() {
  const toast = useToast();
  const { rooms } = useRooms();

  const [rows, setRows] = useState<RoomManagerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [syncEnabled, setSyncEnabled] = useState<boolean | null>(null);
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoomManagerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = useCallback(async () => {
    setIsLoading(true);
    try {
      setRows(await adminApi.managers.list());
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadStatus = useCallback(async () => {
    try {
      const { enabled } = await adminApi.managers.status();
      setSyncEnabled(enabled);
    } catch {
      setSyncEnabled(null);
    }
  }, []);

  useEffect(() => {
    void loadRows();
    void loadStatus();
  }, [loadRows, loadStatus]);

  async function toggleEnabled() {
    if (syncEnabled === null || savingEnabled) return;
    const next = !syncEnabled;
    setSavingEnabled(true);
    try {
      const { enabled } = await adminApi.managers.setEnabled(next);
      setSyncEnabled(enabled);
      toast.success(
        enabled
          ? 'Automatinis vadovų priskyrimas įjungtas'
          : 'Automatinis vadovų priskyrimas išjungtas',
      );
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSavingEnabled(false);
    }
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await adminApi.managers.sync();
      toast.success(
        `Priskirta ${res.autoManagersSet}, palikta rankinių ${res.manualKept}`,
      );
      await loadRows();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.managers.remove(deleteTarget.id);
      toast.success('Vadovas pašalintas');
      setDeleteTarget(null);
      await loadRows();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  // Lentelė grupuota per patalpos numerį (natural sort).
  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) =>
        a.room.number.localeCompare(b.room.number, 'lt', { numeric: true }),
      ),
    [rows],
  );

  return (
    <Wrapper>
      <PageHeader>
        <PageTitle>Vadovai</PageTitle>
        <PrimaryButton type="button" onClick={() => setAssignOpen(true)}>
          + Priskirti vadovą
        </PrimaryButton>
      </PageHeader>

      <Card>
        <CardHead>
          <div>
            <CardTitle>Automatinė sinchronizacija</CardTitle>
            <Muted>Automatinis vadovų priskyrimas iš AM puslapio (kas mėnesį).</Muted>
          </div>
          {syncEnabled !== null && (
            <Switch
              type="button"
              role="switch"
              aria-checked={syncEnabled}
              aria-label="Automatinis vadovų priskyrimas"
              $on={syncEnabled}
              disabled={savingEnabled}
              onClick={() => void toggleEnabled()}
            >
              <Knob $on={syncEnabled} />
            </Switch>
          )}
        </CardHead>

        <StateRow>
          {syncEnabled !== null && (
            <StateBadge $on={syncEnabled}>{syncEnabled ? 'Įjungta' : 'Išjungta'}</StateBadge>
          )}
          <PrimaryButton type="button" onClick={() => void handleSync()} disabled={syncing}>
            {syncing ? 'Sinchronizuojama…' : 'Sinchronizuoti dabar'}
          </PrimaryButton>
        </StateRow>
      </Card>

      {isLoading && rows.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : rows.length === 0 ? (
        <EmptyState>Vadovų dar nėra. Priskirk rankiniu būdu arba sinchronizuok.</EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR>
                <TH>Kabinetas</TH>
                <TH>Vadovas</TH>
                <TH>El. paštas</TH>
                <TH>Šaltinis</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {sortedRows.map((row) => (
                <TR key={row.id}>
                  <TD>
                    {row.room.number}
                    {row.room.name ? ` · ${row.room.name}` : ''}
                  </TD>
                  <TD>{row.user.displayName}</TD>
                  <TD>{row.user.email}</TD>
                  <TD>
                    <SourceBadge $source={row.source}>
                      {row.source === 'auto' ? 'Automatinis' : 'Rankinis'}
                    </SourceBadge>
                  </TD>
                  <TD>
                    <DangerLinkButton type="button" onClick={() => setDeleteTarget(row)}>
                      Trinti
                    </DangerLinkButton>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      <AssignManagerModal
        open={assignOpen}
        rooms={rooms}
        onClose={() => setAssignOpen(false)}
        onSuccess={() => void loadRows()}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => (deleting ? undefined : setDeleteTarget(null))}
        title="Pašalinti vadovą?"
        footer={
          <>
            <SecondaryButton type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Atšaukti
            </SecondaryButton>
            <DangerButton type="button" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? 'Šalinama…' : 'Pašalinti'}
            </DangerButton>
          </>
        }
      >
        {deleteTarget && (
          <p>
            Ar tikrai nori pašalinti vadovą{' '}
            <b>{deleteTarget.user.displayName}</b> iš patalpos{' '}
            <b>
              {deleteTarget.room.number}
              {deleteTarget.room.name ? ` · ${deleteTarget.room.name}` : ''}
            </b>
            ?
          </p>
        )}
      </Modal>
    </Wrapper>
  );
}

interface AssignManagerModalProps {
  open: boolean;
  rooms: ReturnType<typeof useRooms>['rooms'];
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * „Priskirti vadovą" modal'as — patalpa (FilterSelect, rūšiuota pagal aukštą
 * tada numerį) + vartotojo paieška (UserSearchPicker). Submit → managers.add.
 */
function AssignManagerModal({ open, rooms, onClose, onSuccess }: AssignManagerModalProps) {
  const toast = useToast();
  const [roomId, setRoomId] = useState('');
  const [roomError, setRoomError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort(
        (a, b) =>
          a.floor - b.floor || a.number.localeCompare(b.number, 'lt', { numeric: true }),
      ),
    [rooms],
  );

  function reset() {
    setRoomId('');
    setRoomError(null);
    setSelectedUser(null);
    setUserError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    let invalid = false;
    if (!roomId) {
      setRoomError('Pasirink patalpą');
      invalid = true;
    }
    if (!selectedUser) {
      setUserError('Pasirink vartotoją');
      invalid = true;
    }
    if (invalid || !selectedUser) return;

    setSubmitting(true);
    try {
      await adminApi.managers.add(selectedUser.id, roomId);
      toast.success('Vadovas priskirtas');
      onSuccess();
      reset();
      onClose();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Priskirti vadovą"
      footer={
        <>
          <SecondaryButton type="button" onClick={handleClose} disabled={submitting}>
            Atšaukti
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Priskiriama…' : 'Priskirti'}
          </PrimaryButton>
        </>
      }
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit();
        }}
      >
        <Field>
          <FieldLabel>Patalpa *</FieldLabel>
          <FilterSelect
            value={roomId}
            disabled={submitting}
            onChange={(e) => {
              setRoomId(e.target.value);
              setRoomError(null);
            }}
          >
            <option value="">— pasirink —</option>
            {sortedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.floor} a. · {r.number}
                {r.name ? ` · ${r.name}` : ''}
              </option>
            ))}
          </FilterSelect>
          {roomError && <FieldError>{roomError}</FieldError>}
        </Field>

        <Field>
          <FieldLabel>Vadovas *</FieldLabel>
          <UserSearchPicker
            selected={selectedUser}
            disabled={submitting}
            onSelect={(u) => {
              setSelectedUser(u);
              setUserError(null);
            }}
            onClear={() => setSelectedUser(null)}
          />
          {userError && <FieldError>{userError}</FieldError>}
        </Field>
      </Form>
    </Modal>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const CardTitle = styled.h3`
  margin: 0 0 6px 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.navy};
`;

const Switch = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: none;
  padding: 3px;
  cursor: pointer;
  background: ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.border)};
  transition: background 0.15s ease;
  display: flex;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Knob = styled.span<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.15s ease;
  transform: translateX(${({ $on }) => ($on ? '22px' : '0')});
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const StateRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
`;

const StateBadge = styled.span<{ $on: boolean }>`
  display: inline-block;
  padding: 2px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.bg)};
  color: ${({ $on, theme }) => ($on ? '#fff' : theme.colors.text)};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.brand : theme.colors.border)};
`;

const SourceBadge = styled.span<{ $source: 'auto' | 'manual' }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  ${({ $source, theme }) =>
    $source === 'auto'
      ? `background: ${theme.colors.bg}; color: ${theme.colors.text}; border: 1px solid ${theme.colors.border};`
      : `background: ${theme.colors.navy}; color: #fff;`}
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const FieldError = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
`;
