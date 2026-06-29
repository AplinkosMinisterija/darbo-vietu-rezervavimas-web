import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import RoomDetailPage from './RoomDetailPage';
import { AuthProvider } from '../state/auth';
import { RoomsProvider } from '../state/rooms';
import { ToastProvider } from '../components/Toast';
import { theme } from '../styles/theme';
import { makeRoom, makeReservation, makeUser } from '../test/utils';
import type { Reservation, Room, User } from '../types';

vi.mock('../api/auth', () => ({ authApi: { me: vi.fn(), logout: vi.fn() } }));
vi.mock('../api/rooms', () => ({ roomsApi: { list: vi.fn(), get: vi.fn() } }));
vi.mock('../api/reservations', () => ({
  reservationsApi: {
    byDate: vi.fn(),
    create: vi.fn(),
    reserveRecurring: vi.fn(),
    cancel: vi.fn(),
  },
}));

import { authApi } from '../api/auth';
import { roomsApi } from '../api/rooms';
import { reservationsApi } from '../api/reservations';

const me = vi.mocked(authApi.me);
const list = vi.mocked(roomsApi.list);
const byDate = vi.mocked(reservationsApi.byDate);

const room = makeRoom({ id: 'r1', number: '101', name: 'Kabinetas', deskCount: 3, isShared: false });

function setup(opts: { user: User; rooms?: Room[]; reservations?: Reservation[] }) {
  me.mockResolvedValue(opts.user);
  list.mockResolvedValue(opts.rooms ?? [room]);
  byDate.mockResolvedValue(opts.reservations ?? []);
}

function renderDetail(entry = '/rooms/101') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[entry]}>
        <AuthProvider>
          <ToastProvider>
            <RoomsProvider>
              <Routes>
                <Route path="/rooms/:nr" element={<RoomDetailPage />} />
              </Routes>
            </RoomsProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('RoomDetailPage', () => {
  beforeEach(() => {
    me.mockReset();
    list.mockReset();
    byDate.mockReset();
    vi.mocked(reservationsApi.create).mockReset();
  });

  it('renders the room heading and a desk grid sized to deskCount', async () => {
    setup({ user: makeUser({ allowedRoomIds: ['r1'] }) });
    renderDetail();
    expect(await screen.findByText('Kabinetas 101')).toBeInTheDocument();
    expect(screen.getByText('Vieta 1')).toBeInTheDocument();
    expect(screen.getByText('Vieta 2')).toBeInTheDocument();
    expect(screen.getByText('Vieta 3')).toBeInTheDocument();
    expect(screen.queryByText('Vieta 4')).not.toBeInTheDocument();
  });

  it('shows "Patalpa nerasta" for an unknown room number', async () => {
    setup({ user: makeUser({ allowedRoomIds: ['r1'] }) });
    renderDetail('/rooms/999');
    expect(await screen.findByText('Patalpa nerasta')).toBeInTheDocument();
  });

  it('marks a desk reserved by someone else and leaves free desks reservable', async () => {
    setup({
      user: makeUser({ id: 'me', allowedRoomIds: ['r1'] }),
      reservations: [
        makeReservation({
          roomId: 'r1',
          deskNumber: 2,
          user: { id: 'other', displayName: 'Petras Petraitis' },
        }),
      ],
    });
    renderDetail();
    expect(await screen.findByText('Petras Petraitis')).toBeInTheDocument();
    // Desks 1 and 3 are free → two reserve buttons.
    expect(screen.getAllByRole('button', { name: '+ rezervuoti' })).toHaveLength(2);
  });

  it('opens the reserve modal when clicking "+ rezervuoti" on a free desk', async () => {
    setup({ user: makeUser({ id: 'me', allowedRoomIds: ['r1'] }) });
    renderDetail();
    await screen.findByText('Kabinetas 101');
    await userEvent.click(screen.getAllByRole('button', { name: '+ rezervuoti' })[0]);
    expect(await screen.findByRole('dialog', { name: 'Rezervuoti darbo vietą' })).toBeInTheDocument();
  });

  it('blocks reserving when the user has no access and shows the access notice', async () => {
    // Room not shared and not in allowedRoomIds → no access.
    setup({ user: makeUser({ id: 'me', allowedRoomIds: [] }) });
    renderDetail();
    expect(
      await screen.findByText(/Tu negali rezervuoti šioje patalpoje/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ rezervuoti' })).not.toBeInTheDocument();
    expect(screen.getAllByText('nepasiekiama').length).toBeGreaterThan(0);
  });

  it('enforces one-reservation-per-day: shows info notice + blocks free desks when '
    + 'the user already booked another room that day', async () => {
    setup({
      user: makeUser({ id: 'me', allowedRoomIds: ['r1'] }),
      reservations: [
        makeReservation({
          roomId: 'r-other',
          deskNumber: 1,
          user: { id: 'me', displayName: 'Jonas' },
        }),
      ],
    });
    renderDetail();
    expect(
      await screen.findByText(/Tu jau turi rezervaciją tai dienai kitoje patalpoje/),
    ).toBeInTheDocument();
    // All three desks here are free but unreservable (already booked elsewhere).
    expect(screen.queryByRole('button', { name: '+ rezervuoti' })).not.toBeInTheDocument();
    expect(screen.getAllByText('nepasiekiama')).toHaveLength(3);
  });

  it('opens the recurring-reservation modal from the recurring button', async () => {
    setup({ user: makeUser({ id: 'me', allowedRoomIds: ['r1'] }) });
    renderDetail();
    await userEvent.click(
      await screen.findByRole('button', { name: /Rezervuoti pasikartojančiai/ }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Rezervuoti pasikartojančiai' }),
    ).toBeInTheDocument();
  });
});
