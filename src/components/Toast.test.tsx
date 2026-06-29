import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { ToastProvider, useToast } from './Toast';
import { theme } from '../styles/theme';

function Trigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Pavyko')}>ok</button>
      <button onClick={() => toast.error('Nepavyko')}>err</button>
    </div>
  );
}

function renderToast() {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('Toast', () => {
  afterEach(() => vi.useRealTimers());

  it('useToast throws outside a ToastProvider', () => {
    // Silence the expected React error boundary console output.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it('shows success and error messages', async () => {
    renderToast();
    await userEvent.click(screen.getByText('ok'));
    expect(screen.getByText('Pavyko')).toBeInTheDocument();
    await userEvent.click(screen.getByText('err'));
    expect(screen.getByText('Nepavyko')).toBeInTheDocument();
  });

  it('auto-dismisses a toast after 3 seconds', () => {
    vi.useFakeTimers();
    renderToast();
    act(() => {
      screen.getByText('ok').click();
    });
    expect(screen.getByText('Pavyko')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Pavyko')).not.toBeInTheDocument();
  });

  it('dismisses a toast when clicked', async () => {
    renderToast();
    await userEvent.click(screen.getByText('ok'));
    await userEvent.click(screen.getByText('Pavyko'));
    expect(screen.queryByText('Pavyko')).not.toBeInTheDocument();
  });
});
