import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CancelModal from './CancelModal';
import { renderWithProviders, makeAxiosError } from '../test/utils';

vi.mock('../api/reservations', () => ({
  reservationsApi: { cancel: vi.fn() },
}));
import { reservationsApi } from '../api/reservations';
const cancel = vi.mocked(reservationsApi.cancel);

const reservation = {
  id: 'res-1',
  date: '2026-06-29',
  deskNumber: 4,
  roomLabel: '101 · Kabinetas',
};

function renderModal(props: Partial<Parameters<typeof CancelModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  renderWithProviders(
    <CancelModal open reservation={reservation} onClose={onClose} onSuccess={onSuccess} {...props} />,
    { withAuth: false, withRooms: false },
  );
  return { onClose, onSuccess };
}

describe('CancelModal', () => {
  beforeEach(() => cancel.mockReset());

  it('shows the reservation summary', () => {
    renderModal();
    expect(screen.getByText('101 · Kabinetas')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('29 birželis 2026')).toBeInTheDocument();
  });

  it('cancels and reports success', async () => {
    cancel.mockResolvedValue();
    const { onClose, onSuccess } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Atšaukti' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledWith('res-1'));
    expect(await screen.findByText('Rezervacija atšaukta')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('maps CANNOT_CANCEL_PAST to its LT toast', async () => {
    cancel.mockRejectedValueOnce(makeAxiosError({ error: 'CANNOT_CANCEL_PAST' }));
    const { onSuccess } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Atšaukti' }));
    expect(
      await screen.findByText('Negalima atšaukti praėjusios rezervacijos'),
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
