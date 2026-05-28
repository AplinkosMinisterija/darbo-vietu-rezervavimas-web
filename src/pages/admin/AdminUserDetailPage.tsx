import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { adminApi } from '../../api/admin';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import { useRooms } from '../../state/rooms';
import { useAuth } from '../../state/auth';
import { PrimaryButton, SecondaryButton } from '../../components/Modal';
import type { User, UserRole, Room } from '../../types';
import { PageHeader, PageTitle, Muted, RoleBadge } from './shared';

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
  const toast = useToast();
  const { user: meUser } = useAuth();
  const { rooms, isLoading: roomsLoading } = useRooms();

  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<UserRole>('USER');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const u = await adminApi.users.get(id);
      setUser(u);
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

  const hasChanges = roomsChanged || roleChanged;

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
    setSubmitting(true);
    try {
      let nextUser = user;
      if (roomsChanged) {
        nextUser = await adminApi.users.assignRooms(id, Array.from(selectedRoomIds));
      }
      if (roleChanged) {
        nextUser = await adminApi.users.setRole(id, selectedRole);
      }
      setUser(nextUser);
      setSelectedRoomIds(new Set(nextUser.allowedRoomIds ?? []));
      setSelectedRole(nextUser.role);
      toast.success('Pakeitimai išsaugoti');
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setSubmitting(false);
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
        <InfoGrid>
          <Label>Vardas</Label>
          <Value>{user.displayName || '—'}</Value>
          <Label>El. paštas</Label>
          <Value>{user.email}</Value>
          <Label>Rolė</Label>
          <Value>{user.role}</Value>
          {user.msObjectId && (
            <>
              <Label>MS Object ID</Label>
              <Value $mono>{user.msObjectId}</Value>
            </>
          )}
        </InfoGrid>
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
          disabled={!hasChanges || submitting}
        >
          {submitting ? 'Saugoma…' : 'Išsaugoti'}
        </PrimaryButton>
      </Actions>
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
