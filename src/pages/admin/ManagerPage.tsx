import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import styled from 'styled-components';
import { adminApi, type RoomMember, type RoomReservation } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { reservationErrorMessage } from '../../lib/errorMessages';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../state/auth';
import { useRooms } from '../../state/rooms';
import Modal, { DangerButton, PrimaryButton, SecondaryButton } from '../../components/Modal';
import UserSearchPicker from '../../components/admin/UserSearchPicker';
import AssignRoomReservationModal from '../../components/admin/AssignRoomReservationModal';
import { addDays, formatYmd, humanDate, todayYmd } from '../../lib/dates';
import type { Room, User } from '../../types';
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  TableWrapper,
  PageTitle,
  EmptyState,
  Muted,
  DangerLinkButton,
} from './shared';

/** Grafiko langas: nuo šiandien iki +28 dienų. */
const SCHEDULE_DAYS = 28;

/**
 * Managerio portalas — paprastiems SSO vartotojams, kurie valdo bent vieną
 * patalpą (user.managedRoomIds). Kairėje — valdomų patalpų sąrašas; pasirinkus,
 * dešinėje trys blokai: patalpos nustatymai (tik pavadinimas + darbo vietų sk.),
 * priskirti žmonės (members) ir grafikas (artimiausių 4 sav. rezervacijos).
 */
export default function ManagerPage() {
  const { user } = useAuth();
  const { rooms, refetch } = useRooms();

  // Stable primitive key — `user.managedRoomIds` is a fresh array each render,
  // so we memoize on its joined form to avoid re-running on every render.
  const managedKey = (user?.managedRoomIds ?? []).join(',');

  const myRooms = useMemo(() => {
    const managedRoomIds = managedKey ? managedKey.split(',') : [];
    return rooms
      .filter((r) => managedRoomIds.includes(r.id))
      .sort(
        (a, b) =>
          a.floor - b.floor || a.number.localeCompare(b.number, 'lt', { numeric: true }),
      );
  }, [rooms, managedKey]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select pirmą patalpą kai sąrašas užsikrauna / pasikeičia.
  useEffect(() => {
    if (myRooms.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !myRooms.some((r) => r.id === selectedId)) {
      setSelectedId(myRooms[0].id);
    }
  }, [myRooms, selectedId]);

  const selectedRoom = myRooms.find((r) => r.id === selectedId) ?? null;

  if (myRooms.length === 0) {
    return (
      <Wrapper>
        <PageTitle>Mano patalpos</PageTitle>
        <EmptyState>Jūs nevaldote jokių patalpų.</EmptyState>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <PageTitle>Mano patalpos</PageTitle>
      <Layout>
        <RoomList>
          {myRooms.map((r) => (
            <RoomListItem
              key={r.id}
              type="button"
              $active={r.id === selectedId}
              onClick={() => setSelectedId(r.id)}
            >
              <RoomListNumber>{r.number}</RoomListNumber>
              <RoomListMeta>
                {r.floor} a.{r.name ? ` · ${r.name}` : ''}
              </RoomListMeta>
            </RoomListItem>
          ))}
        </RoomList>

        <Panel>
          {selectedRoom ? (
            <RoomPanel key={selectedRoom.id} room={selectedRoom} onRoomChanged={() => void refetch()} />
          ) : (
            <Muted>Pasirink patalpą.</Muted>
          )}
        </Panel>
      </Layout>
    </Wrapper>
  );
}

interface RoomPanelProps {
  room: Room;
  onRoomChanged: () => void;
}

/** Vienos patalpos valdymo blokai. `key={room.id}` (parent'e) remount'ina
 *  state'ą perjungiant patalpą. */
function RoomPanel({ room, onRoomChanged }: RoomPanelProps) {
  return (
    <PanelInner>
      <RoomSettingsSection room={room} onSaved={onRoomChanged} />
      <MembersSection room={room} />
      <ScheduleSection room={room} />
    </PanelInner>
  );
}

const settingsSchema = Yup.object({
  name: Yup.string().trim().required('Privaloma įvesti pavadinimą').max(200, 'Pavadinimas per ilgas'),
  deskCount: Yup.number()
    .typeError('Darbo vietų skaičius turi būti skaičius')
    .integer('Darbo vietų skaičius turi būti sveikas skaičius')
    .min(0, 'Darbo vietų skaičius negali būti neigiamas')
    .required('Privaloma įvesti darbo vietų skaičių'),
});

/** Blokas 1 — patalpa: tik pavadinimas + darbo vietų skaičius (managerio teisės). */
function RoomSettingsSection({ room, onSaved }: { room: Room; onSaved: () => void }) {
  const toast = useToast();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { name: room.name ?? '', deskCount: room.deskCount },
    validationSchema: settingsSchema,
    onSubmit: async (values) => {
      try {
        await adminApi.rooms.update(room.id, {
          name: values.name.trim(),
          deskCount: Number(values.deskCount),
        });
        toast.success('Patalpa atnaujinta');
        onSaved();
      } catch (err) {
        toast.error(adminErrorMessage(err));
      }
    },
  });

  return (
    <Section>
      <SectionTitle>Patalpa</SectionTitle>
      <SectionSub>
        Kabinetas {room.number} · {room.floor} a. (numerio ir aukšto keisti negalima)
      </SectionSub>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          formik.handleSubmit();
        }}
      >
        <Field>
          <FieldLabel>Pavadinimas *</FieldLabel>
          <FieldInput
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
            placeholder="pvz. Posėdžių salė"
          />
          {formik.touched.name && formik.errors.name && (
            <FieldError>{formik.errors.name}</FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel>Darbo vietų skaičius *</FieldLabel>
          <FieldInput
            type="number"
            name="deskCount"
            min={0}
            value={formik.values.deskCount}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
          />
          {formik.touched.deskCount && formik.errors.deskCount && (
            <FieldError>{formik.errors.deskCount}</FieldError>
          )}
        </Field>
        <SaveRow>
          <PrimaryButton type="submit" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saugoma…' : 'Išsaugoti'}
          </PrimaryButton>
        </SaveRow>
      </Form>
    </Section>
  );
}

/** Blokas 2 — priskirti žmonės (members): sąrašas + pridėti / pašalinti. */
function MembersSection({ room }: { room: Room }) {
  const toast = useToast();
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<RoomMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setMembers(await adminApi.rooms.members(room.id));
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [room.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await adminApi.rooms.removeMember(room.id, removeTarget.id);
      toast.success('Žmogus pašalintas');
      setRemoveTarget(null);
      await load();
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Section>
      <SectionHead>
        <SectionTitle>Priskirti žmonės</SectionTitle>
        <PrimaryButton type="button" onClick={() => setAddOpen(true)}>
          + Pridėti žmogų
        </PrimaryButton>
      </SectionHead>

      {isLoading && members.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : members.length === 0 ? (
        <EmptyState>Šiai patalpai dar nepriskirtas nė vienas žmogus.</EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR>
                <TH>Vardas</TH>
                <TH>El. paštas</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {members.map((m) => (
                <TR key={m.id}>
                  <TD>{m.displayName}</TD>
                  <TD>{m.email}</TD>
                  <TD>
                    <DangerLinkButton type="button" onClick={() => setRemoveTarget(m)}>
                      Pašalinti
                    </DangerLinkButton>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      <AddMemberModal
        open={addOpen}
        roomId={room.id}
        onClose={() => setAddOpen(false)}
        onSuccess={() => void load()}
      />

      <Modal
        open={removeTarget !== null}
        onClose={() => (removing ? undefined : setRemoveTarget(null))}
        title="Pašalinti žmogų?"
        footer={
          <>
            <SecondaryButton type="button" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Atšaukti
            </SecondaryButton>
            <DangerButton type="button" onClick={() => void handleRemove()} disabled={removing}>
              {removing ? 'Šalinama…' : 'Pašalinti'}
            </DangerButton>
          </>
        }
      >
        {removeTarget && (
          <p>
            Ar tikrai nori pašalinti <b>{removeTarget.displayName}</b> iš šios patalpos?
          </p>
        )}
      </Modal>
    </Section>
  );
}

interface AddMemberModalProps {
  open: boolean;
  roomId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ open, roomId, onClose, onSuccess }: AddMemberModalProps) {
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setSelectedUser(null);
    setUserError(null);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedUser) {
      setUserError('Pasirink vartotoją');
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.rooms.addMember(roomId, selectedUser.id);
      toast.success('Žmogus pridėtas');
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
      title="Pridėti žmogų"
      footer={
        <>
          <SecondaryButton type="button" onClick={handleClose} disabled={submitting}>
            Atšaukti
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? 'Pridedama…' : 'Pridėti'}
          </PrimaryButton>
        </>
      }
    >
      <Field>
        <FieldLabel>Vartotojas *</FieldLabel>
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
    </Modal>
  );
}

/** Blokas 3 — grafikas: artimiausių 4 sav. rezervacijos + priskirti / atšaukti. */
function ScheduleSection({ room }: { room: Room }) {
  const toast = useToast();
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<RoomReservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const dateFrom = todayYmd();
      const dateTo = formatYmd(addDays(new Date(), SCHEDULE_DAYS));
      setReservations(await adminApi.rooms.reservations(room.id, { dateFrom, dateTo }));
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [room.id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await adminApi.reservations.cancel(cancelTarget.id);
      toast.success('Rezervacija atšaukta');
      setCancelTarget(null);
      await load();
    } catch (err) {
      toast.error(reservationErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Section>
      <SectionHead>
        <SectionTitle>Grafikas</SectionTitle>
        <PrimaryButton type="button" onClick={() => setAssignOpen(true)}>
          + Priskirti rezervaciją
        </PrimaryButton>
      </SectionHead>
      <SectionSub>Artimiausios 4 savaitės</SectionSub>

      {isLoading && reservations.length === 0 ? (
        <Muted>Kraunama…</Muted>
      ) : reservations.length === 0 ? (
        <EmptyState>Artimiausiomis savaitėmis rezervacijų nėra.</EmptyState>
      ) : (
        <TableWrapper>
          <Table>
            <THead>
              <TR>
                <TH>Data</TH>
                <TH>Vieta</TH>
                <TH>Vartotojas</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {reservations.map((r) => (
                <TR key={r.id}>
                  <TD>{humanDate(r.date)}</TD>
                  <TD>{r.deskNumber}</TD>
                  <TD>{r.user.displayName}</TD>
                  <TD>
                    <DangerLinkButton type="button" onClick={() => setCancelTarget(r)}>
                      Atšaukti
                    </DangerLinkButton>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrapper>
      )}

      <AssignRoomReservationModal
        open={assignOpen}
        room={room}
        onClose={() => setAssignOpen(false)}
        onSuccess={() => void load()}
      />

      <Modal
        open={cancelTarget !== null}
        onClose={() => (cancelling ? undefined : setCancelTarget(null))}
        title="Atšaukti rezervaciją?"
        footer={
          <>
            <SecondaryButton type="button" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              Uždaryti
            </SecondaryButton>
            <DangerButton type="button" onClick={() => void handleCancel()} disabled={cancelling}>
              {cancelling ? 'Atšaukiama…' : 'Atšaukti'}
            </DangerButton>
          </>
        }
      >
        {cancelTarget && (
          <p>
            Ar tikrai nori atšaukti rezervaciją{' '}
            <b>
              vieta {cancelTarget.deskNumber} · {humanDate(cancelTarget.date)}
            </b>{' '}
            (vartotojas: {cancelTarget.user.displayName})?
          </p>
        )}
      </Modal>
    </Section>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: ${({ theme }) => theme.ui.spacing.lg};
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.ui.spacing.md};
  }
`;

const RoomList = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.xs};

  @media (max-width: 768px) {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const RoomListItem = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: ${({ theme }) => `${theme.ui.spacing.sm} ${theme.ui.spacing.md}`};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.brand : theme.colors.border)};
  background: ${({ $active, theme }) => ($active ? theme.colors.brand : theme.colors.surface)};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text)};
  cursor: pointer;
  text-align: left;

  &:hover {
    border-color: ${({ theme }) => theme.colors.brand};
  }

  @media (max-width: 768px) {
    flex-shrink: 0;
    white-space: nowrap;
  }
`;

const RoomListNumber = styled.span`
  font-size: 14px;
  font-weight: 600;
`;

const RoomListMeta = styled.span`
  font-size: 12px;
  opacity: 0.8;
`;

const Panel = styled.div`
  min-width: 0;
`;

const PanelInner = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
`;

const SectionHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.navy};
`;

const SectionSub = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
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

const FieldInput = styled.input`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const FieldError = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
`;

const SaveRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;
