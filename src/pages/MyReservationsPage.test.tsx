import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyReservationsPage from './MyReservationsPage';
import { renderWithProviders, makeMyReservation } from '../test/utils';

vi.mock('../api/reservations', () => ({
  reservationsApi: { mine: vi.fn(), cancel: vi.fn() },
}));
import { reservationsApi } from '../api/reservations';
const mine = vi.mocked(reservationsApi.mine);
const cancel = vi.mocked(reservationsApi.cancel);

function render() {
  return renderWithProviders(<MyReservationsPage />, { withAuth: false, withRooms: false });
}

describe('MyReservationsPage', () => {
  beforeEach(() => {
    mine.mockReset();
    cancel.mockReset();
  });

  it('shows an error message when loading fails', async () => {
    mine.mockRejectedValue(new Error('boom'));
    render();
    expect(
      await screen.findByText('Nepavyko užkrauti rezervacijų. Bandyk vėliau.'),
    ).toBeInTheDocument();
  });

  it('shows the empty state when there are no reservations', async () => {
    mine.mockResolvedValue([]);
    render();
    expect(await screen.findByText('Tu neturi rezervacijų.')).toBeInTheDocument();
  });

  it('lists reservations newest-date first and tags past ones as "įvykusi"', async () => {
    mine.mockResolvedValue([
      makeMyReservation({ id: 'past', date: '2020-01-01', deskNumber: 2 }),
      makeMyReservation({ id: 'future', date: '2030-01-01', deskNumber: 7 }),
    ]);
    render();
    await screen.findByText('Vieta 7', { exact: false });

    // Sorted by date desc → future (2030) appears before past (2020).
    const dates = screen.getAllByText(/2030|2020/);
    expect(dates[0]).toHaveTextContent('2030');
    expect(dates[1]).toHaveTextContent('2020');

    // Past reservation: "įvykusi" tag, no cancel button.
    expect(screen.getByText('įvykusi')).toBeInTheDocument();
    // Exactly one cancel button (only the future reservation).
    expect(screen.getAllByRole('button', { name: 'Atšaukti' })).toHaveLength(1);
  });

  it('cancels a future reservation: opens modal, calls cancel(id), reloads, toasts', async () => {
    const future = makeMyReservation({ id: 'fut-1', date: '2030-01-01', deskNumber: 7 });
    mine.mockResolvedValueOnce([future]).mockResolvedValueOnce([]); // reload returns empty
    cancel.mockResolvedValue();
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Atšaukti' }));

    // Confirmation modal appears.
    const dialog = await screen.findByRole('dialog', { name: 'Atšaukti rezervaciją?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Atšaukti' }));

    await waitFor(() => expect(cancel).toHaveBeenCalledWith('fut-1'));
    expect(await screen.findByText('Rezervacija atšaukta')).toBeInTheDocument();
    // After reload the list is empty.
    expect(await screen.findByText('Tu neturi rezervacijų.')).toBeInTheDocument();
  });
});
