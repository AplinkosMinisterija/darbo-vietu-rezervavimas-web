import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomCard from './RoomCard';
import { renderWithTheme, makeRoom } from '../test/utils';

describe('RoomCard', () => {
  it('shows room number and pluralised free-count text', () => {
    renderWithTheme(
      <RoomCard room={makeRoom({ number: '305', deskCount: 4 })} reservedCount={1} isMyRoom={false} isClickable />,
    );
    expect(screen.getByText('305')).toBeInTheDocument();
    expect(screen.getByText('3 laisvos')).toBeInTheDocument();
    expect(screen.getByText('/ 4')).toBeInTheDocument();
  });

  it('renders "1 laisva" (singular) when exactly one desk is free', () => {
    renderWithTheme(
      <RoomCard room={makeRoom({ deskCount: 4 })} reservedCount={3} isMyRoom={false} isClickable />,
    );
    expect(screen.getByText('1 laisva')).toBeInTheDocument();
  });

  it('renders "pilna" when no desks are free', () => {
    renderWithTheme(
      <RoomCard room={makeRoom({ deskCount: 4 })} reservedCount={4} isMyRoom={false} isClickable />,
    );
    expect(screen.getByText('pilna')).toBeInTheDocument();
  });

  it('shows "mano" badge for the user\'s own room and "bendra" for shared rooms', () => {
    renderWithTheme(
      <RoomCard
        room={makeRoom({ isShared: true, name: 'Bendros vietos' })}
        reservedCount={0}
        isMyRoom
        isClickable
      />,
    );
    expect(screen.getByText('mano')).toBeInTheDocument();
    expect(screen.getByText('bendra')).toBeInTheDocument();
    expect(screen.getByText('Bendros vietos')).toBeInTheDocument();
  });

  it('clickable card is a button and fires onClick', async () => {
    const onClick = vi.fn();
    renderWithTheme(
      <RoomCard room={makeRoom()} reservedCount={0} isMyRoom={false} isClickable onClick={onClick} />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('non-clickable card renders no button', () => {
    const onClick = vi.fn();
    renderWithTheme(
      <RoomCard
        room={makeRoom()}
        reservedCount={0}
        isMyRoom={false}
        isClickable={false}
        onClick={onClick}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
