import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import type { Reservation, Room, User } from '../types';

interface Props {
  user: User | null;
  rooms: Room[];
  reservations: Reservation[];
}

/**
 * "Tavo kabinetas" banner'is — paima pirmą non-shared kabinetą iš
 * `allowedRoomIds`. Jei tokio nėra (pvz. user'is tik turi shared coworking
 * prieigą), fallback'as — pirmas allowed room. Logic'a:
 *
 *   1. allowedRoomIds tuščias → „kabinetas nenustatytas".
 *   2. find non-shared room; jei nėra — pirmas iš sąrašo.
 *   3. count reservations.filter(r=>r.roomId==room.id) → laisva = deskCount - reserved.
 *   4. jei laisva == 0 → raudonas, kitaip žalias.
 *
 * Clickable → /rooms/:nr.
 */
export default function MyRoomBanner({ user, rooms, reservations }: Props) {
  const navigate = useNavigate();

  if (!user) return null;

  const ids = user.allowedRoomIds ?? [];
  if (ids.length === 0) {
    return (
      <StaticBanner $tone="neutral">
        <Left>
          <strong>Tavo kabinetas nenustatytas</strong>
          <RoomName>Susisiek su administratoriumi — tau dar nepriskirta darbo vieta.</RoomName>
        </Left>
      </StaticBanner>
    );
  }

  const allowed = rooms.filter((r) => ids.includes(r.id));
  if (allowed.length === 0) {
    return (
      <StaticBanner $tone="neutral">
        <Left>
          <strong>Tavo kabinetas nenustatytas</strong>
          <RoomName>Tau priskirtos patalpos šiuo metu neprieinamos.</RoomName>
        </Left>
      </StaticBanner>
    );
  }

  // Stack a banner per allowed cabinet. Sort so a user's own (non-shared)
  // cabinet comes first, then any shared/group rooms below.
  const sorted = [...allowed].sort((a, b) => {
    if (a.isShared === b.isShared) return a.number.localeCompare(b.number);
    return a.isShared ? 1 : -1;
  });

  const isSingle = sorted.length === 1;

  return (
    <Stack>
      {sorted.map((room) => {
        const reservedCount = reservations.filter((r) => r.roomId === room.id).length;
        const free = room.deskCount - reservedCount;
        const tone: BannerTone = free <= 0 ? 'danger' : 'success';
        const label = isSingle ? 'Tavo kabinetas' : 'Tau prieinamas kabinetas';
        return (
          <ClickableBanner
            key={room.id}
            $tone={tone}
            type="button"
            onClick={() => navigate(`/rooms/${room.number}`)}
            aria-label={`Atidaryti kabinetą ${room.number}`}
          >
            <Left>
              <strong>
                {label}: {room.number}
              </strong>
              {room.name && <RoomName>{room.name}</RoomName>}
            </Left>
            <Right>
              {tone === 'danger' ? (
                <span>Pilna — nėra laisvų vietų</span>
              ) : (
                <span>
                  {free === 1 ? '1 laisva vieta' : `${free} laisvos vietos`}
                  <Muted> / {room.deskCount}</Muted>
                </span>
              )}
              <Chevron>→</Chevron>
            </Right>
          </ClickableBanner>
        );
      })}
    </Stack>
  );
}

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

type BannerTone = 'success' | 'danger' | 'neutral';

const bannerBase = css<{ $tone: BannerTone }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
  padding: ${({ theme }) => `${theme.ui.spacing.md} ${theme.ui.spacing.lg}`};
  border-radius: ${({ theme }) => theme.ui.radius};
  color: #fff;
  font-family: inherit;
  text-align: left;
  background: ${({ $tone, theme }) =>
    $tone === 'success'
      ? theme.colors.brand
      : $tone === 'danger'
        ? theme.colors.danger
        : theme.colors.mute};

  strong {
    font-size: 16px;
    font-weight: 600;
  }
  span {
    font-size: 14px;
    opacity: 0.95;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: ${({ theme }) => theme.ui.spacing.md};
  }
`;

const StaticBanner = styled.div<{ $tone: BannerTone }>`
  ${bannerBase};
`;

const ClickableBanner = styled.button<{ $tone: BannerTone }>`
  ${bannerBase};
  border: none;
  cursor: pointer;
  width: 100%;
  transition: filter 0.12s ease;

  &:hover {
    filter: brightness(1.05);
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RoomName = styled.span`
  font-size: 13px;
  opacity: 0.9;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const Muted = styled.span`
  opacity: 0.75;
`;

const Chevron = styled.span`
  font-size: 18px;
  opacity: 0.9;
`;
