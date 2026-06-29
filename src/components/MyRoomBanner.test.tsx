import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import MyRoomBanner from './MyRoomBanner';
import { theme } from '../styles/theme';
import { makeRoom, makeReservation, makeUser, renderWithTheme } from '../test/utils';
import type { Reservation, Room, User } from '../types';

function renderBanner(user: User | null, rooms: Room[], reservations: Reservation[]) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={<MyRoomBanner user={user} rooms={rooms} reservations={reservations} />}
          />
          <Route path="/rooms/:nr" element={<div>Kabineto puslapis</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('MyRoomBanner', () => {
  it('renders nothing when there is no user', () => {
    const { container } = renderWithTheme(
      <MyRoomBanner user={null} rooms={[makeRoom()]} reservations={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "nenustatytas" when the user has no assigned and no shared rooms', () => {
    const user = makeUser({ allowedRoomIds: [] });
    renderBanner(user, [makeRoom({ isShared: false })], []);
    expect(screen.getByText('Tavo kabinetas nenustatytas')).toBeInTheDocument();
  });

  it('single accessible room: "Tavo kabinetas" label + free count', () => {
    const room = makeRoom({ number: '210', deskCount: 4 });
    const user = makeUser({ allowedRoomIds: [room.id] });
    renderBanner(user, [room], [makeReservation({ roomId: room.id })]);
    expect(screen.getByText('Tavo kabinetas: 210')).toBeInTheDocument();
    expect(screen.getByText(/3 laisvos vietos/)).toBeInTheDocument();
  });

  it('shows the "Pilna" state when the room is fully booked', () => {
    const room = makeRoom({ number: '210', deskCount: 1 });
    const user = makeUser({ allowedRoomIds: [room.id] });
    renderBanner(user, [room], [makeReservation({ roomId: room.id })]);
    expect(screen.getByText('Pilna — nėra laisvų vietų')).toBeInTheDocument();
  });

  it('multiple accessible rooms: uses plural label and lists the assigned room before shared', () => {
    const mine = makeRoom({ number: '101', isShared: false, deskCount: 4 });
    const shared = makeRoom({ number: '309', isShared: true, deskCount: 10 });
    const user = makeUser({ allowedRoomIds: [mine.id] });
    renderBanner(user, [shared, mine], []);
    const labels = screen.getAllByText(/Tau prieinamas kabinetas/);
    expect(labels).toHaveLength(2);
    // Assigned (non-shared) cabinet sorts first.
    const banners = screen.getAllByRole('button');
    expect(banners[0]).toHaveTextContent('101');
    expect(banners[1]).toHaveTextContent('309');
  });

  it('navigates to /rooms/:number on click', async () => {
    const room = makeRoom({ number: '210' });
    const user = makeUser({ allowedRoomIds: [room.id] });
    renderBanner(user, [room], []);
    await userEvent.click(screen.getByRole('button', { name: /Atidaryti kabinetą 210/ }));
    expect(screen.getByText('Kabineto puslapis')).toBeInTheDocument();
  });
});
