import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeskCard from './DeskCard';
import { renderWithTheme } from '../test/utils';

const baseProps = {
  deskNumber: 3,
  reservedBy: null,
  isMine: false,
  canReserve: true,
  canCancel: true,
  onReserve: vi.fn(),
  onCancel: vi.fn(),
};

describe('DeskCard', () => {
  it('free + canReserve → shows "+ rezervuoti" and fires onReserve', async () => {
    const onReserve = vi.fn();
    renderWithTheme(<DeskCard {...baseProps} onReserve={onReserve} />);
    expect(screen.getByText('Laisva')).toBeInTheDocument();
    expect(screen.getByText('Vieta 3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ rezervuoti' }));
    expect(onReserve).toHaveBeenCalledOnce();
  });

  it('free + !canReserve → shows "nepasiekiama", no reserve button', () => {
    renderWithTheme(<DeskCard {...baseProps} canReserve={false} />);
    expect(screen.getByText('nepasiekiama')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ rezervuoti' })).not.toBeInTheDocument();
  });

  it('taken by someone else → shows their name, no cancel button', () => {
    renderWithTheme(
      <DeskCard
        {...baseProps}
        reservedBy={{ id: 'x', displayName: 'Petras Petraitis' }}
        isMine={false}
      />,
    );
    expect(screen.getByText('Petras Petraitis')).toBeInTheDocument();
    expect(screen.queryByText('Laisva')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'atšaukti' })).not.toBeInTheDocument();
  });

  it('mine + canCancel → shows "Tu" and a cancel button that fires onCancel', async () => {
    const onCancel = vi.fn();
    renderWithTheme(
      <DeskCard
        {...baseProps}
        reservedBy={{ id: 'me', displayName: 'Jonas' }}
        isMine
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('Tu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'atšaukti' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('mine + !canCancel (past date) → no cancel button', () => {
    renderWithTheme(
      <DeskCard
        {...baseProps}
        reservedBy={{ id: 'me', displayName: 'Jonas' }}
        isMine
        canCancel={false}
      />,
    );
    expect(screen.getByText('Tu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'atšaukti' })).not.toBeInTheDocument();
  });
});
