import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReserveModal from './ReserveModal';
import { renderWithProviders, makeRoom, makeAxiosError } from '../test/utils';

vi.mock('../api/reservations', () => ({
  reservationsApi: { create: vi.fn() },
}));
import { reservationsApi } from '../api/reservations';
const create = vi.mocked(reservationsApi.create);

const room = makeRoom({ id: 'r1', number: '101', name: 'Kabinetas' });

function renderModal(props: Partial<Parameters<typeof ReserveModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  renderWithProviders(
    <ReserveModal
      open
      room={room}
      deskNumber={2}
      date="2026-06-29"
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />,
    { withAuth: false, withRooms: false },
  );
  return { onClose, onSuccess };
}

describe('ReserveModal', () => {
  beforeEach(() => create.mockReset());

  it('shows the cabinet, desk and date summary', () => {
    renderModal();
    expect(screen.getByText('Vieta')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('29 birželis 2026')).toBeInTheDocument();
  });

  it('falls back to a notice when desk data is missing', () => {
    renderModal({ deskNumber: null });
    expect(screen.getByText('Nepakanka duomenų rezervacijai.')).toBeInTheDocument();
  });

  it('creates the reservation and reports success', async () => {
    create.mockResolvedValue({} as never);
    const { onClose, onSuccess } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Rezervuoti' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({ roomId: 'r1', deskNumber: 2, date: '2026-06-29' }),
    );
    expect(await screen.findByText('Rezervacija sukurta')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('maps a server error code to its LT toast', async () => {
    create.mockRejectedValueOnce(makeAxiosError({ error: 'DESK_TAKEN' }));
    const { onSuccess } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Rezervuoti' }));
    expect(
      await screen.findByText('Ši darbo vieta tą dieną jau rezervuota — perskaityk iš naujo'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
