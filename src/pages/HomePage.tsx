import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import WeekStrip from '../components/WeekStrip';
import MonthCalendar from '../components/MonthCalendar';
import MyRoomBanner from '../components/MyRoomBanner';
import RoomCard from '../components/RoomCard';
import { useAuth } from '../state/auth';
import { useRooms } from '../state/rooms';
import { useReservations } from '../state/reservations';
import { todayYmd } from '../lib/dates';
import { filterRooms, type RoomSharedFilter } from '../lib/roomFilter';
import type { Room } from '../types';

/**
 * Citizen pagrindinis langas. Flow'as iš prototipo:
 *   1. Pasirink datą (WeekStrip arba kalendoriaus popover).
 *   2. Pamatyk savo kabineto banner'į (laisva/pilna).
 *   3. Aukšto switcher → kortelių grid'as.
 *   4. Klikamas tik savo kabinetas arba shared rooms (kitos kortelės — read-only).
 */
export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rooms, isLoading: roomsLoading } = useRooms();

  const [selectedDate, setSelectedDate] = useState<string>(todayYmd());
  const [calOpen, setCalOpen] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [shared, setShared] = useState<RoomSharedFilter>('all');
  const floorInitialized = useRef(false);

  const searchId = useId();
  const sharedId = useId();

  const { data: reservations, isLoading: resLoading } = useReservations(selectedDate);
  const safeReservations = reservations ?? [];

  const allowedIds = useMemo(() => new Set(user?.allowedRoomIds ?? []), [user]);

  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => set.add(r.floor));
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  // Default'iname `floor` į user'io kabineto aukštą — tik vieną kartą, kad
  // vėliau pasirinktas „Visi" (floor === null) nebūtų perrašytas.
  useEffect(() => {
    if (floorInitialized.current || rooms.length === 0) return;
    floorInitialized.current = true;
    const myRoom = rooms.find((r) => allowedIds.has(r.id) && !r.isShared);
    setFloor(myRoom ? myRoom.floor : (floors[0] ?? null));
  }, [rooms, floors, allowedIds]);

  const floorRooms = useMemo(
    () => filterRooms(rooms, { query, floor, shared }),
    [rooms, query, floor, shared],
  );
  const reservedByRoom = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of safeReservations) {
      map.set(r.roomId, (map.get(r.roomId) ?? 0) + 1);
    }
    return map;
  }, [safeReservations]);

  function isClickable(room: Room): boolean {
    if (allowedIds.has(room.id)) return true;
    if (room.isShared) return true;
    return false;
  }

  return (
    <Wrapper>
      <DateRow>
        <WeekStrip selectedDate={selectedDate} onSelect={setSelectedDate} />
        <CalToggle
          type="button"
          aria-label="Atidaryti kalendorių"
          onClick={() => setCalOpen(true)}
        >
          📅
        </CalToggle>
      </DateRow>

      <MonthCalendar
        open={calOpen}
        onClose={() => setCalOpen(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <MyRoomBanner user={user} rooms={rooms} reservations={safeReservations} />

      <FloorBar>
        <FloorLabel>Aukštas:</FloorLabel>
        {floors.length === 0 && !roomsLoading && (
          <Muted>Patalpų sąrašas tuščias.</Muted>
        )}
        {floors.length > 0 && (
          <FloorTab type="button" $active={floor === null} onClick={() => setFloor(null)}>
            Visi
          </FloorTab>
        )}
        {floors.map((f) => (
          <FloorTab key={f} type="button" $active={f === floor} onClick={() => setFloor(f)}>
            {f}
          </FloorTab>
        ))}

        <FilterLabel htmlFor={searchId}>Ieškoti</FilterLabel>
        <SearchInput
          id={searchId}
          type="search"
          placeholder="kabineto numeris ar pavadinimas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <FilterLabel htmlFor={sharedId}>Bendra?</FilterLabel>
        <SharedSelect
          id={sharedId}
          value={shared}
          onChange={(e) => setShared(e.target.value as RoomSharedFilter)}
        >
          <option value="all">Visos</option>
          <option value="shared">Tik bendros</option>
          <option value="private">Tik nebendros</option>
        </SharedSelect>
      </FloorBar>

      {roomsLoading || resLoading ? (
        <Muted>Kraunama…</Muted>
      ) : floorRooms.length === 0 ? (
        <Muted>Pagal filtrą patalpų nerasta.</Muted>
      ) : (
        <Grid>
          {floorRooms.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
              reservedCount={reservedByRoom.get(r.id) ?? 0}
              isMyRoom={allowedIds.has(r.id)}
              isClickable={isClickable(r)}
              onClick={() => navigate(`/rooms/${r.number}`)}
            />
          ))}
        </Grid>
      )}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};
`;

const DateRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  align-items: stretch;
`;

const CalToggle = styled.button`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  width: 48px;
  font-size: 22px;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.bg}; }
`;

const FloorBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  flex-wrap: wrap;
`;

const FloorLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMute};
  margin-right: 4px;
`;

const FilterLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMute};
  margin-left: ${({ theme }) => theme.ui.spacing.sm};
`;

const SearchInput = styled.input`
  flex: 1 1 200px;
  min-width: 160px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.navy};
    outline-offset: 1px;
  }
`;

const SharedSelect = styled.select`
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.navy};
    outline-offset: 1px;
  }
`;

const FloorTab = styled.button<{ $active: boolean }>`
  background: ${({ theme, $active }) =>
    $active ? theme.colors.navy : theme.colors.surface};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.navy : theme.colors.border)};
  padding: 6px 14px;
  font-size: 14px;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-weight: 500;
  &:hover { background: ${({ theme, $active }) =>
      $active ? theme.colors.navy : theme.colors.bg}; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.ui.spacing.md};

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: ${({ theme }) => theme.ui.spacing.sm};
  }
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 14px;
  margin: 0;
`;
