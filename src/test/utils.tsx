import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';
import { AuthProvider } from '../state/auth';
import { RoomsProvider } from '../state/rooms';
import { ToastProvider } from '../components/Toast';
import type { MyReservation, Reservation, Room, User } from '../types';

/**
 * Shared render helper. Wraps the unit under test in the same provider stack
 * the real app uses (theme + router + auth + toast + rooms). Individual tests
 * are expected to `vi.mock('../api/*')` so the providers' on-mount fetches
 * resolve against fakes rather than the network.
 */
interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Router entries; defaults to ['/']. */
  initialEntries?: string[];
  /** Include real <AuthProvider> (fetches authApi.me on mount). Default true. */
  withAuth?: boolean;
  /** Include real <RoomsProvider> (fetches roomsApi.list on mount). Default true. */
  withRooms?: boolean;
}

export function renderWithProviders(ui: ReactElement, options: ProvidersOptions = {}) {
  const {
    initialEntries = ['/'],
    withAuth = true,
    withRooms = true,
    ...rest
  } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = (
      <ToastProvider>{withRooms ? <RoomsProvider>{children}</RoomsProvider> : children}</ToastProvider>
    );
    if (withAuth) tree = <AuthProvider>{tree}</AuthProvider>;
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>{tree}</MemoryRouter>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}

/**
 * Minimal wrapper for presentational components: styled-components theme +
 * a router (some leaf components call useNavigate/Link). No API providers.
 */
export function renderWithTheme(
  ui: ReactElement,
  options: { initialEntries?: string[] } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { initialEntries = ['/'], ...rest } = options;
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </ThemeProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...rest });
}

/**
 * Render a component at a parametric route (e.g. /rooms/:nr) and expose a
 * location probe so tests can assert on redirects/navigation.
 */
export function renderRoutes(
  routes: ReactElement,
  options: { initialEntries?: string[]; withAuth?: boolean; withRooms?: boolean } = {},
) {
  const { initialEntries = ['/'], withAuth = true, withRooms = true } = options;

  function Wrapper() {
    let tree: ReactNode = (
      <ToastProvider>
        <Routes>
          {routes.props.children}
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </ToastProvider>
    );
    if (withRooms) tree = <RoomsProvider>{tree}</RoomsProvider>;
    if (withAuth) tree = <AuthProvider>{tree}</AuthProvider>;
    return (
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>{tree}</MemoryRouter>
      </ThemeProvider>
    );
  }

  return render(<Wrapper />);
}

/** Renders the current pathname so navigation assertions are possible. */
function LocationProbe() {
  return <div data-testid="location-probe" />;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let seq = 0;
const nextId = () => `id-${++seq}`;

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'jonas@example.com',
    displayName: 'Jonas Jonaitis',
    role: 'USER',
    allowedRoomIds: [],
    managedRoomIds: [],
    ...overrides,
  };
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: nextId(),
    number: '101',
    name: 'Kabinetas',
    floor: 1,
    deskCount: 4,
    isShared: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: nextId(),
    roomId: 'room-1',
    deskNumber: 1,
    date: '2026-06-29',
    user: { id: 'other-user', displayName: 'Petras Petraitis' },
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeMyReservation(overrides: Partial<MyReservation> = {}): MyReservation {
  return {
    id: nextId(),
    roomId: 'room-1',
    deskNumber: 1,
    date: '2026-06-29',
    room: { number: '101', name: 'Kabinetas', floor: 1 },
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Builds an axios-error-shaped object carrying `response.data.error` (and
 * optional `type`/`data`) so error-mapping helpers see the codes they expect.
 */
export function makeAxiosError(body: Record<string, unknown>, status = 400) {
  return { response: { status, data: body } };
}
