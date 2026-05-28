import styled from 'styled-components';
import type { ReservationUser } from '../types';

interface Props {
  deskNumber: number;
  reservedBy: ReservationUser | null;
  isMine: boolean;
  canReserve: boolean;
  canCancel: boolean;
  onReserve: () => void;
  onCancel: () => void;
}

/**
 * Stalo (desk) kortelė kabineto detail page'e. Trys state'ai:
 *   - laisva + canReserve → „+ rezervuoti"
 *   - užimta kito vartotojo → vardas + raudonas tonas
 *   - užimta mano → vardas + mėlynas tonas + „atšaukti" (jei canCancel)
 */
export default function DeskCard({
  deskNumber,
  reservedBy,
  isMine,
  canReserve,
  canCancel,
  onReserve,
  onCancel,
}: Props) {
  const tone: DeskTone = !reservedBy ? 'free' : isMine ? 'mine' : 'taken';

  return (
    <Card $tone={tone}>
      <Head>
        <Emoji>🪑</Emoji>
        <Label>Vieta {deskNumber}</Label>
      </Head>

      <Body>
        {reservedBy ? (
          <Who $tone={tone}>{isMine ? 'Tu' : reservedBy.displayName}</Who>
        ) : (
          <FreeText>Laisva</FreeText>
        )}
      </Body>

      <Foot>
        {!reservedBy && canReserve && (
          <ActionPrimary type="button" onClick={onReserve}>
            + rezervuoti
          </ActionPrimary>
        )}
        {!reservedBy && !canReserve && <ActionMute>nepasiekiama</ActionMute>}
        {isMine && canCancel && (
          <ActionDanger type="button" onClick={onCancel}>
            atšaukti
          </ActionDanger>
        )}
      </Foot>
    </Card>
  );
}

type DeskTone = 'free' | 'mine' | 'taken';

const Card = styled.div<{ $tone: DeskTone }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.ui.radius};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid
    ${({ theme, $tone }) =>
      $tone === 'mine'
        ? theme.colors.navy
        : $tone === 'taken'
          ? theme.colors.danger
          : theme.colors.border};
  min-height: 124px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Emoji = styled.span`
  font-size: 22px;
`;

const Label = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Body = styled.div`
  flex: 1;
`;

const Who = styled.div<{ $tone: DeskTone }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme, $tone }) =>
    $tone === 'mine' ? theme.colors.navy : theme.colors.danger};
`;

const FreeText = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const Foot = styled.div`
  display: flex;
  gap: 8px;
`;

const buttonBase = `
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
`;

const ActionPrimary = styled.button`
  ${buttonBase}
  color: ${({ theme }) => theme.colors.brand};
  &:hover { color: #4a9c6e; }
`;

const ActionDanger = styled.button`
  ${buttonBase}
  color: ${({ theme }) => theme.colors.danger};
  &:hover { color: #b91c1c; }
`;

const ActionMute = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
  font-style: italic;
`;
