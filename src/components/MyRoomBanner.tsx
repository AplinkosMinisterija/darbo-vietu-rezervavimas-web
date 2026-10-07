import { useNavigate } from 'react-router-dom';
import styled, { css } from 'styled-components';
import type { Reservation, Room, User } from '../types';

interface Props {
  user: User | null;
  rooms: Room[];
  reservations: Reservation[];
  /** Įjungia „Tik mano" filtrą kortelių tinklelyje. */
  onShowMine: () => void;
}

/**
 * Viena eilutė apie naudotojo kabinetus — ne sąrašas. Patys kabinetai
 * gyvena kortelių tinklelyje su „mano" ženkleliu, todėl juostos juos
 * tik dubliavo ir prie 40 kabinetų nustumdavo filtrus už ekrano.
 *
 * Prieinama = priskirti kabinetai + visos bendros patalpos (jas gali
 * rezervuoti kiekvienas).
 */
export default function MyRoomBanner({ user, rooms, reservations, onShowMine }: Props) {
  const navigate = useNavigate();

  if (!user) return null;

  const ids = user.allowedRoomIds ?? [];
  const accessible = rooms.filter((r) => ids.includes(r.id) || r.isShared);

  if (accessible.length === 0) {
    return (
      <Banner $tone="neutral">
        <Left>
          <strong>Tavo kabinetas nenustatytas</strong>
          <Sub>Susisiek su administratoriumi — tau dar nepriskirta darbo vieta.</Sub>
        </Left>
      </Banner>
    );
  }

  const freeIn = (room: Room) =>
    Math.max(room.deskCount - reservations.filter((r) => r.roomId === room.id).length, 0);
  const totalFree = accessible.reduce((sum, room) => sum + freeIn(room), 0);
  const totalDesks = accessible.reduce((sum, room) => sum + room.deskCount, 0);
  const tone = totalFree > 0 ? 'success' : 'danger';

  if (accessible.length === 1) {
    const room = accessible[0];
    const free = freeIn(room);
    return (
      <Banner $tone={tone}>
        <Left>
          <strong>
            Tavo kabinete {room.number} — {freeLabel(free)}
          </strong>
          {room.name && <Sub>{room.name}</Sub>}
        </Left>
        <Action type="button" onClick={() => navigate(`/rooms/${room.number}`)}>
          Rezervuoti
        </Action>
      </Banner>
    );
  }

  return (
    <Banner $tone={tone}>
      <Left>
        <strong>Tavo kabinetuose — {freeLabel(totalFree)} iš {totalDesks}</strong>
        <Sub>Tau prieinami {accessible.length} kabinetai</Sub>
      </Left>
      <Action type="button" onClick={onShowMine}>
        Rodyti mano kabinetus
      </Action>
    </Banner>
  );
}

function freeLabel(free: number): string {
  if (free === 0) return 'laisvų vietų nėra';
  return free === 1 ? '1 laisva vieta' : `${free} laisvos vietos`;
}

type BannerTone = 'success' | 'danger' | 'neutral';

const Banner = styled.div<{ $tone: BannerTone }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
  padding: ${({ theme }) => `${theme.ui.spacing.md} ${theme.ui.spacing.lg}`};
  border-radius: ${({ theme }) => theme.ui.radius};
  color: #fff;
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

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: ${({ theme }) => theme.ui.spacing.md};
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Sub = styled.span`
  font-size: 13px;
  opacity: 0.9;
`;

const actionBase = css`
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.65);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  cursor: pointer;
  &:hover {
    background: rgba(0, 0, 0, 0.45);
  }
  &:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }
`;

const Action = styled.button`
  ${actionBase};
`;
