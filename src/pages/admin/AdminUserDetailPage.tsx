import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import { useRooms } from '../../state/rooms';
import { useAuth } from '../../state/auth';
import Modal, { DangerButton, PrimaryButton, SecondaryButton } from '../../components/Modal';
import type { User, UserRole, Room } from '../../types';
import { PageHeader, PageTitle, Muted, RoleBadge } from './shared';

/** Pragmatiškas el. pašto formatas — BE turi authoritative `type: 'email'`
 *  validaciją; čia tik užkardome akivaizdžiai blogą įvestį prieš PUT. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Vienas vartotojas — keičiam allowed rooms (multi-checkbox per floor) ir
 * role (USER/ADMIN). Save'as gali daryti iki 2 BE call'ų:
 *   1) PUT /users/:id/rooms — jei pasikeitė roomIds set'as
 *   2) PUT /users/:id/role — jei pasikeitė role
 *
 * Self-demote saugiklis: ADMIN→USER radio disabled, jei tai esamas
 * vartotojas. BE taip pat blok'ina, bet UI signal'as svarbus, kad
 * vartotojas suprastų kodėl mygtukas ne-reaguoja.
 */
export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: meUser } = useAuth();
  const { rooms, isLoading: roomsLoading } = useRooms();

  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const u = await adminApi.users.get(id);
      setUser(u);
      setName(u.displayName ?? '');
      setEmail(u.email ?? '');
      setSelectedRoomIds(new Set(u.allowedRoomIds ?? []));
      setSelectedRole(u.role);
    } catch (e) {
      setLoadError(e);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isSelf = !!meUser && !!user && meUser.id === user.id;
  const cannotDemoteSelf = isSelf && user?.role === 'ADMIN';

  const initialRoomIds = useMemo(
    () => new Set(user?.allowedRoomIds ?? []),
    [user],
  );

  const roomsChanged = useMemo(() => {
    if (selectedRoomIds.size !== initialRoomIds.size) return true;
    for (const id of selectedRoomIds) {
      if (!initialRoomIds.has(id)) return true;
    }
    return false;
  }, [selectedRoomIds, initialRoomIds]);

  const roleChanged = user ? selectedRole !== user.role : false;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const infoChanged = user
    ? trimmedName !== (user.displayName ?? '') || trimmedEmail !== (user.email ?? '')
    : false;

  const nameError = trimmedName.length === 0 ? 'Vardas negali būti tuščias' : null;
  const emailError = !EMAIL_RE.test(trimmedEmail) ? 'Neteisingas el. pašto formatas' : null;
  const infoInvalid = infoChanged && (nameError !== null || emailError !== null);

  const hasChanges = roomsChanged || roleChanged || infoChanged;

  const roomsByFloor = useMemo(() => {
    const grouped = new Map<number, Room[]>();
    for (const r of rooms) {
      const list = grouped.get(r.floor) ?? [];
      list.push(r);
      grouped.set(r.floor, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [rooms]);

  function toggleRoom(id: string) {
    setSelectedRoomIds((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!id || !user) return;
    if (infoInvalid) {
      toast.error(nameError ?? emailError ?? 'Patikrink įvestus duomenis');
      return;
    }
    setSubmitting(true);
    try {
      let nextUser = user;
      // Identity first — only send the fields that actually changed.
      if (infoChanged) {
        nextUser = await adminApi.users.update(id, {
          displayName: trimmedName !== (user.displayName ?? '') ? trimmedName : undefined,
          email: trimmedEmail !== (user.email ?? '') ? trimmedEmail : undefined,
        });
      }
      if (roomsChanged) {
        nextUser = await adminApi.users.assignRooms(id, Array.from(selectedRoomIds));
      }
      if (roleChanged) {
        nextUser = await adminApi.users.setRole(id, selectedRole);
      }
      setUser(nextUser);
      setName(nextUser.displayName ?? '');
      setEmail(nextUser.email ?? '');
      setSelectedRoomIds(new Set(nextUser.allowedRoomIds ?? []));
      setSelectedRole(nextUser.role);
      toast.success('Pakeitimai išsaugoti');
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await adminApi.users.remove(id);
      toast.success('Naudotojas ištrintas');
      navigate('/admin/users');
    } catch (err) {
      toast.error(adminErrorMessage(err));
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loadError) {
    return (
      <Wrapper>
        <BackLink to="/admin/users">← Atgal į sąrašą</BackLink>
        <Muted>Nepavyko užkrauti vartotojo.</Muted>
      </Wrapper>
    );
  }

  if (!user || roomsLoading) {
    return (
      <Wrapper>
        <BackLink to="/admin/users">← Atgal į sąrašą</BackLink>
        <Muted>Kraunama…</Muted>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <BackLink to="/admin/users">← Atgal į sąrašą</BackLink>

      <PageHeader>
        <PageTitle>{user.displayName || user.email}</PageTitle>
        <RoleBadge $role={user.role}>{user.role}</RoleBadge>
      </PageHeader>

      <Section>
        <SectionTitle>Vartotojo informacija</SectionTitle>
        <Field>
          <FieldLabel>Vardas, pavardė</FieldLabel>
          <FieldInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Vardas Pavardė"
          />
          {infoChanged && nameError && <FieldError>{nameError}</FieldError>}
        </Field>
        <Field>
          <FieldLabel>El. paštas</FieldLabel>
          <FieldInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            placeholder="vardas.pavarde@am.lt"
          />
          {infoChanged && emailError && <FieldError>{emailError}</FieldError>}
        </Field>
        {user.msObjectId && (
          <InfoGrid>
            <Label>MS Object ID</Label>
            <Value $mono>{user.msObjectId}</Value>
          </InfoGrid>
        )}
      </Section>

      <Section>
        <SectionTitle>Rolė</SectionTitle>
        <RoleOptions>
          <RoleOption>
            <input
              type="radio"
              name="role"
              value="USER"
              checked={selectedRole === 'USER'}
              disabled={cannotDemoteSelf}
              onChange={() => setSelectedRole('USER')}
            />
            <span>USER</span>
          </RoleOption>
          <RoleOption>
            <input
              type="radio"
              name="role"
              value="ADMIN"
              checked={selectedRole === 'ADMIN'}
              onChange={() => setSelectedRole('ADMIN')}
            />
            <span>ADMIN</span>
          </RoleOption>
        </RoleOptions>
        {cannotDemoteSelf && (
          <Hint title="Negali pažeminti save">
            Negali pažeminti save — ADMIN→USER galima atlikti tik per kitą admin'ą.
          </Hint>
        )}
      </Section>

      <Section>
        <SectionTitle>
          Leidžiamos patalpos ({selectedRoomIds.size} / {rooms.length})
        </SectionTitle>
        {roomsByFloor.length === 0 ? (
          <Muted>Patalpų sąraše dar nieko nėra.</Muted>
        ) : (
          <FloorList>
            {roomsByFloor.map(([floor, list]) => (
              <FloorBlock key={floor}>
                <FloorHeader>{floor} aukštas</FloorHeader>
                <RoomChecks>
                  {list.map((r) => (
                    <CheckLabel key={r.id}>
                      <input
                        type="checkbox"
                        checked={selectedRoomIds.has(r.id)}
                        onChange={() => toggleRoom(r.id)}
                      />
                      <span>
                        {r.number}
                        {r.name && <Sub> · {r.name}</Sub>}
                        {r.isShared && <SharedTag>bendra</SharedTag>}
                      </span>
                    </CheckLabel>
                  ))}
                </RoomChecks>
              </FloorBlock>
            ))}
          </FloorList>
        )}
      </Section>

      <Actions>
        <SecondaryButton type="button" as={Link} to="/admin/users">
          Atšaukti
        </SecondaryButton>
        <PrimaryButton
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || infoInvalid || submitting}
        >
          {submitting ? 'Saugoma…' : 'Išsaugoti'}
        </PrimaryButton>
      </Actions>

      <DangerSection>
        <DangerCopy>
          <SectionTitle>Pavojinga zona</SectionTitle>
          <Muted>
            Ištrynus naudotoją jis paslepiamas iš sąrašų, o jo būsimos
            rezervacijos atšaukiamos. Rezervacijų istorija išsaugoma. Jei žmogus
            vėl prisijungs per Microsoft — paskyra atsistato.
          </Muted>
          {isSelf && <Hint>Negalima ištrinti savo paskyros.</Hint>}
        </DangerCopy>
        <DangerButton
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={isSelf || submitting}
          title={isSelf ? 'Negalima ištrinti savo paskyros' : undefined}
        >
          Ištrinti naudotoją
        </DangerButton>
      </DangerSection>

      <Modal
        open={deleteOpen}
        onClose={() => (deleting ? undefined : setDeleteOpen(false))}
        title="Ištrinti naudotoją?"
        footer={
          <>
            <SecondaryButton
              type="button"
              onClick={() => setDeleteOpen(false)}
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
        <p>
          Ar tikrai nori ištrinti naudotoją <b>{user.displayName || user.email}</b>?
          Jo būsimos rezervacijos bus atšauktos, o istorija išsaugoma. Veiksmą
          galima atstatyti — žmogui vėl prisijungus per Microsoft.
        </p>
      </Modal>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const BackLink = styled(Link)`
  color: ${({ theme }) => theme.colors.brand};
  font-size: 13px;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 6px 16px;
  font-size: 14px;
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
`;

const Value = styled.span<{ $mono?: boolean }>`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ $mono }) => ($mono ? 'monospace' : 'inherit')};
  word-break: break-all;
`;

const RoleOptions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const RoleOption = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
  input:disabled + span {
    color: ${({ theme }) => theme.colors.textMute};
    cursor: not-allowed;
  }
`;

const Hint = styled.p`
  margin: 4px 0 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.warning};
`;

const FloorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const FloorBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FloorHeader = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.navy};
`;

const RoomChecks = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 4px 12px;
`;

const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
`;

const Sub = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 12px;
`;

const SharedTag = styled.span`
  margin-left: 6px;
  font-size: 11px;
  background: ${({ theme }) => theme.colors.brand};
  color: #fff;
  padding: 1px 6px;
  border-radius: 999px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.ui.spacing.sm};
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
  &:disabled {
    background: ${({ theme }) => theme.colors.bg};
  }
`;

const FieldError = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
`;

const DangerSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
`;

const DangerCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 560px;
`;
