import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { roomsApi } from '../api/rooms';
import type { Room } from '../types';

/**
 * Rooms context — fetch'inam vieną kartą ant mount'o, dalinamės su visais
 * page'iais (HomePage, RoomDetailPage, MyRoomBanner). Rooms list'as
 * keičiasi reta — invalidate'inti gali rankiniu būdu per `refetch()`.
 */
interface RoomsState {
  rooms: Room[];
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  /** Find by `number` (URL param `:nr`). */
  findByNumber: (nr: string) => Room | undefined;
  findById: (id: string) => Room | undefined;
}

const RoomsContext = createContext<RoomsState | null>(null);

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await roomsApi.list();
      setRooms(items);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<RoomsState>(
    () => ({
      rooms,
      isLoading,
      error,
      refetch,
      findByNumber: (nr: string) => rooms.find((r) => r.number === nr),
      findById: (id: string) => rooms.find((r) => r.id === id),
    }),
    [rooms, isLoading, error, refetch],
  );

  return createElement(RoomsContext.Provider, { value }, children);
}

export function useRooms(): RoomsState {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms turi būti naudojamas <RoomsProvider> viduje');
  return ctx;
}
