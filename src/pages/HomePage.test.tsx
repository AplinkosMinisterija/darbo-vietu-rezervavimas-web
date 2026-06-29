import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import HomePage from './HomePage';
import { AuthProvider } from '../state/auth';
import { RoomsProvider } from '../state/rooms';
import { ToastProvider } from '../components/Toast';
import { theme } from '../styles/theme';
import { makeRoom, makeUser } from '../test/utils';
import type { Room, User } from '../types';

vi.mock('../api/auth', () => ({ authApi: { me: vi.fn(), logout: vi.fn() } }));
vi.mock('../api/rooms', () => ({ roomsApi: { list: vi.fn(), get: vi.fn() } }));
vi.mock('../api/reservations', () => ({ reservationsApi: { byDate: vi.fn() } }));

import { authApi } from '../api/auth';
import { roomsApi } from '../api/rooms';
import { reservationsApi } from '../api/reservations';

const me = vi.mocked(authApi.me);
const list = vi.mocked(roomsApi.list);
const byDate = vi.mocked(reservationsApi.byDate);

function setup(user: User, rooms: Room[]) {
  me.mockResolvedValue(user);
  list.mockResolvedValue(rooms);
  byDate.mockResolvedValue([]);
}

function renderHome() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ToastProvider>
            <RoomsProvider>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/rooms/:nr" element={<div>Kabineto puslapis :nr</div>} />
              </Routes>
            </RoomsProvider>
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

const room1 = makeRoom({ id: 'r1', number: '101', floor: 1, isShared: false });
const room2 = makeRoom({ id: 'r2', number: '102', floor: 1, isShared: true });
const room3 = makeRoom({ id: 'r3', number: '201', floor: 2, isShared: false });

describe('HomePage', () => {
  beforeEach(() => {
    me.mockReset();
    list.mockReset();
    byDate.mockReset();
  });

  it('renders only the default floor (1) room cards', async () => {
    setup(makeUser({ allowedRoomIds: ['r1'] }), [room1, room2, room3]);
    renderHome();
    expect(await screen.findByText('101', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('102', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('201', { exact: true })).not.toBeInTheDocument();
  });

  it('switching floors shows the other floor rooms', async () => {
    setup(makeUser({ allowedRoomIds: ['r1'] }), [room1, room2, room3]);
    renderHome();
    await screen.findByText('101', { exact: true });
    const floorTab2 = screen.getAllByRole('button').find((b) => b.textContent === '2')!;
    await userEvent.click(floorTab2);
    expect(await screen.findByText('201', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('101', { exact: true })).not.toBeInTheDocument();
  });

  it('own + shared rooms are clickable, other rooms are not', async () => {
    setup(makeUser({ allowedRoomIds: ['r1'] }), [room1, room2, room3]);
    renderHome();
    await screen.findByText('101', { exact: true });
    // On floor 1: 101 (mine) and 102 (shared) are buttons.
    const cardButtons = screen
      .getAllByRole('button')
      .filter((b) => /^10[12]/.test(b.textContent ?? ''));
    expect(cardButtons).toHaveLength(2);

    // Switch to floor 2: 201 is "other" → rendered as a static (non-button) card.
    const floorTab2 = screen.getAllByRole('button').find((b) => b.textContent === '2')!;
    await userEvent.click(floorTab2);
    await screen.findByText('201', { exact: true });
    const room201Button = screen
      .queryAllByRole('button')
      .find((b) => (b.textContent ?? '').startsWith('201'));
    expect(room201Button).toBeUndefined();
  });

  it('clicking a clickable room navigates to /rooms/:number', async () => {
    setup(makeUser({ allowedRoomIds: ['r1'] }), [room1, room2, room3]);
    renderHome();
    await screen.findByText('101', { exact: true });
    const card101 = screen
      .getAllByRole('button')
      .find((b) => (b.textContent ?? '').startsWith('101'))!;
    await userEvent.click(card101);
    await waitFor(() => expect(screen.getByText('Kabineto puslapis :nr')).toBeInTheDocument());
  });

  it("KNOWN BUG: defaults to floor 1 instead of the user's room floor when floor 1 exists "
    + '(effect only runs if current floor is absent from the floor list) - when porting to HR: '
    + "default to the user's assigned room floor", async () => {
    // User's only room is on floor 2, but another room exists on floor 1.
    const myFloor2 = makeRoom({ id: 'r1', number: '201', floor: 2, isShared: false });
    const otherFloor1 = makeRoom({ id: 'r9', number: '101', floor: 1, isShared: false });
    setup(makeUser({ allowedRoomIds: ['r1'] }), [otherFloor1, myFloor2]);
    renderHome();
    // Grid shows floor-1 content (101), NOT the user's floor-2 room (201 only in banner).
    expect(await screen.findByText('101', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('201', { exact: true })).not.toBeInTheDocument();
  });
});
