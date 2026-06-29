import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import WeekStrip from './WeekStrip';
import { renderWithTheme } from '../test/utils';

// 2026-06-29 is a Monday → that week is Mon 29 .. Sun 5 Jul.
// NB: clicks use fireEvent (synchronous); userEvent + fake timers deadlocks.
function dayButtons() {
  // Layout: [← , 7 day buttons , →]
  return screen.getAllByRole('button').slice(1, 8);
}

describe('WeekStrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 29, 9, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('renders seven day buttons for the selected week', () => {
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={vi.fn()} />);
    expect(dayButtons()).toHaveLength(7);
    expect(within(dayButtons()[0]).getByText('Pr')).toBeInTheDocument();
    expect(within(dayButtons()[0]).getByText('29')).toBeInTheDocument();
  });

  it('disables weekend days (Sat + Sun)', () => {
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={vi.fn()} />);
    const days = dayButtons();
    expect(days[0]).toBeEnabled(); // Mon 29 (today)
    expect(days[4]).toBeEnabled(); // Fri 3
    expect(days[5]).toBeDisabled(); // Sat 4
    expect(days[6]).toBeDisabled(); // Sun 5
  });

  it('marks the selected day with aria-pressed', () => {
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={vi.fn()} />);
    expect(dayButtons()[0]).toHaveAttribute('aria-pressed', 'true');
    expect(dayButtons()[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSelect with the YMD of a clicked enabled day', () => {
    const onSelect = vi.fn();
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={onSelect} />);
    fireEvent.click(dayButtons()[1]); // Tue 30
    expect(onSelect).toHaveBeenCalledWith('2026-06-30');
  });

  it('does not call onSelect for a disabled (weekend) day', () => {
    const onSelect = vi.fn();
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={onSelect} />);
    fireEvent.click(dayButtons()[6]); // Sun 5 (disabled)
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('the ← / → buttons shift the visible week', () => {
    const onSelect = vi.fn();
    renderWithTheme(<WeekStrip selectedDate="2026-06-29" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Kita savaitė' }));
    // Next week Mon = 2026-07-06.
    fireEvent.click(dayButtons()[0]);
    expect(onSelect).toHaveBeenCalledWith('2026-07-06');
  });
});
