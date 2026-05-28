import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import WeekStrip from '../components/WeekStrip';
import MonthCalendar from '../components/MonthCalendar';
import DeskCard from '../components/DeskCard';
import ReserveModal from '../components/ReserveModal';
import CancelModal from '../components/CancelModal';
import { useAuth } from '../state/auth';
import { useRooms } from '../state/rooms';
import { useReservations } from '../state/reservations';
import { humanDate, isPastDate, todayYmd } from '../lib/dates';

/**
 * Kabineto detail puslapis. Sprendimai:
 *   - URL param'as `:nr` ne `:id`, kad URL atrodytų human-readable (309)
 *     atitinkant prototipo nav semantiką.
 *   - DeskGrid generuojamas iš `room.deskCount` (numeravimas 1..N).
 *   - canReserve = ne praeities data + (allowedRoom arba isShared).
 *   - canCancel = ne praeities data ir rezervacija mano.
 */
export default function RoomDetailPage() {
  const { nr = '' } = useParams<{ nr: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isLoading: roomsLoading, findByNumber } = useRooms();

  const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
  const [calOpen, setCalOpen] = useState(false);

  const { data: reservations, isLoading: resLoading, invalidate } =
    useReservations(selectedDate);

  const room = useMemo(() => findByNumber(nr), [findByNumber, nr]);
  const safeReservations = reservations ?? [];

  const allowedIds = useMemo(() => new Set(user?.allowedRoomIds ?? []), [user]);
  const canAccessRoom = !!room && (allowedIds.has(room.id) || room.isShared);
  const isPast = isPastDate(selectedDate);

  // Map<deskNumber, reservation> for greitam lookup'ui kortelėse.
  const byDesk = useMemo(() => {
    const map = new Map<number, (typeof safeReservations)[number]>();
    if (room) {
      for (const r of safeReservations) {
        if (r.roomId === room.id) map.set(r.deskNumber, r);
      }
    }
    return map;
  }, [safeReservations, room]);

  // Modal state'as.
  const [reserveDesk, setReserveDesk] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    date: string;
    deskNumber: number;
    roomLabel: string;
  } | null>(null);

  if (roomsLoading) {
    return <Wrapper><Muted>Kraunama…</Muted></Wrapper>;
  }
  if (!room) {
    return (
      <Wrapper>
        <BackLink to="/">← Atgal</BackLink>
        <h2>Patalpa nerasta</h2>
        <Muted>Toks kabineto numeris ({nr}) sąraše neegzistuoja.</Muted>
      </Wrapper>
    );
  }

  const desks = Array.from({ length: room.deskCount }, (_, i) => i + 1);

  return (
    <Wrapper>
      <TopRow>
        <BackButton type="button" onClick={() => navigate('/')}>← Atgal</BackButton>
        <Heading>
          <h2>
            Kabinetas {room.number}
            {room.name && <SubName> · {room.name}</SubName>}
          </h2>
          <Muted>
            {room.floor} aukštas · {room.deskCount} vietos
            {room.isShared && ' · bendra darbo erdvė'}
          </Muted>
        </Heading>
      </TopRow>

      <DateRow>
        <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
        <CalToggle type="button" onClick={() => setCalOpen(true)} aria-label="Kalendorius">
          📅
        </CalToggle>
      </DateRow>

      <MonthCalendar
        open={calOpen}
        onClose={() => setCalOpen(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <DateLabel>{humanDate(selectedDate)}</DateLabel>

      {!canAccessRoom && (
        <Notice>
          Tu negali rezervuoti šioje patalpoje — ji nepriskirta tau ir nėra bendra.
        </Notice>
      )}

      {resLoading ? (
        <Muted>Kraunama rezervacijos…</Muted>
      ) : (
        <Grid>
          {desks.map((dn) => {
            const r = byDesk.get(dn) ?? null;
            const isMine = !!(r && user && r.user.id === user.id);
            return (
              <DeskCard
                key={dn}
                deskNumber={dn}
                reservedBy={r ? r.user : null}
                isMine={isMine}
                canReserve={!isPast && canAccessRoom}
                canCancel={!isPast}
                onReserve={() => setReserveDesk(dn)}
                onCancel={() => {
                  if (!r) return;
                  setCancelTarget({
                    id: r.id,
                    date: r.date,
                    deskNumber: r.deskNumber,
                    roomLabel: `${room.number}${room.name ? ` · ${room.name}` : ''}`,
                  });
                }}
              />
            );
          })}
        </Grid>
      )}

      <ReserveModal
        open={reserveDesk !== null}
        onClose={() => setReserveDesk(null)}
        room={room}
        deskNumber={reserveDesk}
        date={selectedDate}
        onSuccess={invalidate}
      />

      <CancelModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        reservation={cancelTarget}
        onSuccess={invalidate}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const BackButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: 8px 14px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  &:hover { background: ${({ theme }) => theme.colors.surface}; }
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: ${({ theme }) => theme.ui.spacing.md};
  color: ${({ theme }) => theme.colors.navy};
  font-size: 14px;
`;

const Heading = styled.div`
  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.navy};
    font-size: 22px;
  }
`;

const SubName = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 17px;
`;

const DateRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const CalToggle = styled.button`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  width: 48px;
  font-size: 22px;
  &:hover { background: ${({ theme }) => theme.colors.bg}; }
`;

const DateLabel = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.navy};
`;

const Notice = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.md};
  background: #FEF3C7;
  border: 1px solid #FCD34D;
  border-radius: ${({ theme }) => theme.ui.radius};
  color: #92400E;
  font-size: 14px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: ${({ theme }) => theme.ui.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: ${({ theme }) => theme.ui.spacing.sm};
  }
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  margin: 0;
`;
