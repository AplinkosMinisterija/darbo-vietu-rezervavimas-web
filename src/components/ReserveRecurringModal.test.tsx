import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReserveRecurringModal from './ReserveRecurringModal';
import { renderWithProviders, makeRoom, makeAxiosError } from '../test/utils';

vi.mock('../api/reservations', () => ({
  reservationsApi: { reserveRecurring: vi.fn() },
}));
import { reservationsApi } from '../api/reservations';
const recur = vi.mocked(reservationsApi.reserveRecurring);

const room = makeRoom({ id: 'room-x', number: '210', name: 'Bendra' });

function renderModal(props: Partial<Parameters<typeof ReserveRecurringModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  renderWithProviders(
    <ReserveRecurringModal open room={room} onClose={onClose} onSuccess={onSuccess} {...props} />,
    { withAuth: false, withRooms: false },
  );
  return { onClose, onSuccess };
}

describe('ReserveRecurringModal', () => {
  beforeEach(() => recur.mockReset());

  it('renders weekday chips and a weeks dropdown defaulting to 4', () => {
    renderModal();
    for (const label of ['Pr', 'An', 'Tr', 'Kt', 'Pn']) {
      expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('combobox')).toHaveValue('4');
  });

  it('disables submit until at least one weekday is chosen', async () => {
    renderModal();
    const submit = screen.getByRole('button', { name: 'Rezervuoti' });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pr' }));
    expect(screen.getByRole('checkbox', { name: 'Pr' })).toHaveAttribute('aria-checked', 'true');
    expect(submit).toBeEnabled();
  });

  it('submits the correct payload (roomId, sorted weekdays, weeks)', async () => {
    recur.mockResolvedValue({ created: 5, dates: [] });
    const { onClose, onSuccess } = renderModal();
    // Click out of order; component keeps weekdays sorted ascending.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tr' })); // 3
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pr' })); // 1
    await userEvent.selectOptions(screen.getByRole('combobox'), '8');
    await userEvent.click(screen.getByRole('button', { name: 'Rezervuoti' }));

    await waitFor(() =>
      expect(recur).toHaveBeenCalledWith({ roomId: 'room-x', weekdays: [1, 3], weeks: 8 }),
    );
    expect(await screen.findByText('Sukurta rezervacijų: 5')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows a RECURRING_CONFLICT message listing full + already-booked dates', async () => {
    recur.mockRejectedValueOnce(
      makeAxiosError(
        {
          type: 'RECURRING_CONFLICT',
          data: { full: ['2026-07-01'], alreadyBooked: ['2026-07-02'] },
        },
        409,
      ),
    );
    const { onSuccess } = renderModal();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pr' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rezervuoti' }));

    const toast = await screen.findByText(/Negalima sukurti/);
    expect(toast).toHaveTextContent('nėra laisvų vietų: 1 liepa 2026');
    expect(toast).toHaveTextContent('jau turi rezervaciją: 2 liepa 2026');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('falls back to the generic reservation message for non-conflict errors', async () => {
    recur.mockRejectedValueOnce(makeAxiosError({ error: 'DESK_TAKEN' }));
    renderModal();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pr' }));
    await userEvent.click(screen.getByRole('button', { name: 'Rezervuoti' }));
    expect(
      await screen.findByText('Ši darbo vieta tą dieną jau rezervuota — perskaityk iš naujo'),
    ).toBeInTheDocument();
  });
});
