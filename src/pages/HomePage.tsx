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
import {
  SHARED_FILTER_OPTIONS,
  filterRooms,
  roomFloors,
  type RoomSharedFilter,
} from '../lib/roomFilter';
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
  const floorsLabelId = useId();

  const { data: reservations, isLoading: resLoading } = useReservations(selectedDate);
  const safeReservations = reservations ?? [];

  const allowedIds = useMemo(() => new Set(user?.allowedRoomIds ?? []), [user]);

  const floors = useMemo(() => roomFloors(rooms), [rooms]);

  // Default'iname `floor` į user'io kabineto aukštą — tik vieną kartą, kad
  // vėliau pasirinktas „Visi" (floor === null) nebūtų perrašytas.
  useEffect(() => {
    if (floorInitialized.current || rooms.length === 0) return;
    floorInitialized.current = true;
    const myRoom = rooms.find((r) => allowedIds.has(r.id) && !r.isShared);
    setFloor(myRoom ? myRoom.floor : (floors[0] ?? null));
  }, [rooms, floors, allowedIds]);

  // Įvedus paieškos tekstą ieškome per VISUS aukštus — kitaip kabineto iš kito
  // aukšto nerastum, kol nepaspaudei „Visi".
  const isSearching = query.trim().length > 0;
  const floorRooms = useMemo(
    () => filterRooms(rooms, { query, floor: isSearching ? null : floor, shared }),
    [rooms, query, isSearching, floor, shared],
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

      <MyRoomBanner
        user={user}
        rooms={rooms}
        reservations={safeReservations}
        onShowMine={() => {
          setFloor(null);
          setQuery('');
        }}
      />

      <FloorBar>
        <FloorLabel id={floorsLabelId}>Aukštas:</FloorLabel>
        {floors.length === 0 && !roomsLoading && (
          <Muted>Patalpų sąrašas tuščias.</Muted>
        )}
        <FloorTabs role="group" aria-labelledby={floorsLabelId}>
          {floors.length > 0 && (
            <FloorTab
              type="button"
              aria-pressed={isSearching || floor === null}
              $active={isSearching || floor === null}
              onClick={() => setFloor(null)}
            >
              Visi
            </FloorTab>
          )}
          {floors.map((f) => (
            <FloorTab
              key={f}
              type="button"
              aria-pressed={!isSearching && f === floor}
              $active={!isSearching && f === floor}
              onClick={() => setFloor(f)}
            >
              {f}
            </FloorTab>
          ))}
        </FloorTabs>

        <FilterGroup $grow>
          <FilterLabel htmlFor={searchId}>Ieškoti</FilterLabel>
          <SearchInput
            id={searchId}
            type="search"
            placeholder="kabineto numeris ar pavadinimas"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </FilterGroup>

        {isSearching && <SearchHint>ieškoma visuose aukštuose</SearchHint>}

        <FilterGroup>
          <FilterLabel htmlFor={sharedId}>Bendra?</FilterLabel>
          <SharedSelect
            id={sharedId}
            value={shared}
            onChange={(e) => setShared(e.target.value as RoomSharedFilter)}
          >
            {SHARED_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SharedSelect>
        </FilterGroup>
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

const FloorTabs = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  flex-wrap: wrap;
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

/* Etiketė ir jos laukas turi keltis į kitą eilutę kartu, o ne atskirai. */
const FilterGroup = styled.div<{ $grow?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  flex: ${({ $grow }) => ($grow ? '1 1 220px' : '0 0 auto')};
  margin-left: ${({ theme }) => theme.ui.spacing.sm};
`;

const FilterLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textMute};
  white-space: nowrap;
`;

const SearchHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const SearchInput = styled.input`
  flex: 1 1 auto;
  min-width: 120px;
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
