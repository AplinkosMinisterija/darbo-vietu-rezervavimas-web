import styled from 'styled-components';
import type { Room } from '../types';

interface Props {
  room: Room;
  reservedCount: number;
  isMyRoom: boolean;
  isClickable: boolean;
  onClick?: () => void;
}

/**
 * Kabineto kortelė ant home page floor grid'o. Indicator dot'as:
 *   - žalia, jei <60% užimta
 *   - geltona, 60-90%
 *   - raudona, >90% arba pilna
 *
 * Non-clickable (vartotojas neturi prieigos) — pilkas hover'is.
 */
export default function RoomCard({
  room,
  reservedCount,
  isMyRoom,
  isClickable,
  onClick,
}: Props) {
  const free = room.deskCount - reservedCount;
  const ratio = room.deskCount > 0 ? reservedCount / room.deskCount : 0;
  const tone: 'ok' | 'warn' | 'full' =
    ratio >= 1 ? 'full' : ratio >= 0.9 ? 'full' : ratio >= 0.6 ? 'warn' : 'ok';

  const content = (
    <>
      <Header>
        <Number>{room.number}</Number>
        {isMyRoom && <Badge>mano</Badge>}
        {room.isShared && <SharedBadge>bendra</SharedBadge>}
      </Header>
      {room.name && <Name>{room.name}</Name>}
      <Footer>
        <Dot $tone={tone} />
        <Free>
          {free <= 0
            ? 'pilna'
            : free === 1
              ? '1 laisva'
              : `${free} laisvos`}
          <Muted> / {room.deskCount}</Muted>
        </Free>
      </Footer>
    </>
  );

  if (isClickable) {
    return (
      <ClickCard type="button" onClick={onClick} $isMy={isMyRoom}>
        {content}
      </ClickCard>
    );
  }
  return <StaticCard $isMy={isMyRoom}>{content}</StaticCard>;
}

const baseStyles = `
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  text-align: left;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #E5E7EB;
  min-height: 96px;
`;

const StaticCard = styled.div<{ $isMy: boolean }>`
  ${baseStyles}
  border-color: ${({ theme, $isMy }) =>
    $isMy ? theme.colors.brand : theme.colors.border};
  opacity: 0.85;
`;

const ClickCard = styled.button<{ $isMy: boolean }>`
  ${baseStyles}
  font-family: inherit;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    transform 0.06s ease,
    box-shadow 0.12s ease;
  border-color: ${({ theme, $isMy }) =>
    $isMy ? theme.colors.brand : theme.colors.border};

  &:hover {
    border-color: ${({ theme }) => theme.colors.navy};
    box-shadow: 0 4px 12px rgba(41, 52, 111, 0.08);
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Number = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.navy};
`;

const Name = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
  line-height: 1.3;
`;

const Badge = styled.span`
  background: ${({ theme }) => theme.colors.brand};
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 500;
`;

const SharedBadge = styled.span`
  background: ${({ theme }) => theme.colors.navy};
  color: #fff;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 999px;
  font-weight: 500;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
`;

const Dot = styled.span<{ $tone: 'ok' | 'warn' | 'full' }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $tone, theme }) =>
    $tone === 'ok'
      ? theme.colors.success
      : $tone === 'warn'
        ? theme.colors.warning
        : theme.colors.danger};
`;

const Free = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text};
`;

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
`;
