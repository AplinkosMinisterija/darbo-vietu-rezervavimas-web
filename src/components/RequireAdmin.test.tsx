import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import RequireAdmin from './RequireAdmin';
import { AuthProvider } from '../state/auth';
import { theme } from '../styles/theme';
import { makeUser } from '../test/utils';

vi.mock('../api/auth', () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));
import { authApi } from '../api/auth';
const meMock = vi.mocked(authApi.me);

function renderGate() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <AuthProvider>
          <RequireAdmin>
            <div>Admin turinys</div>
          </RequireAdmin>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('RequireAdmin', () => {
  beforeEach(() => meMock.mockReset());

  it('renders children for an ADMIN user', async () => {
    meMock.mockResolvedValue(makeUser({ role: 'ADMIN' }));
    renderGate();
    expect(await screen.findByText('Admin turinys')).toBeInTheDocument();
  });

  it('renders an inline 403 (no redirect) for a non-admin user', async () => {
    meMock.mockResolvedValue(makeUser({ role: 'USER' }));
    renderGate();
    expect(await screen.findByText('403')).toBeInTheDocument();
    expect(screen.getByText('Tu neturi prieigos prie šio puslapio.')).toBeInTheDocument();
    expect(screen.queryByText('Admin turinys')).not.toBeInTheDocument();
  });

  it('KNOWN BUG: shows 403 during the initial loading window before /me resolves '
    + '(isAdmin defaults false, isLoading is ignored) so an admin briefly sees a 403 flash '
    + '- when porting to HR: separate loading from forbidden', async () => {
    // Deferred (resolved below) so the pending mock does not dangle and block Vitest.
    let resolveMe!: (u: ReturnType<typeof makeUser>) => void;
    meMock.mockReturnValue(new Promise((r) => { resolveMe = r; }));
    renderGate();
    // RequireAdmin only checks isAdmin, never isLoading, so an admin briefly
    // sees a 403 flash before their role loads.
    expect(screen.getByText('403')).toBeInTheDocument();
    // Settle: once the ADMIN role loads, the gate renders the children.
    resolveMe(makeUser({ role: 'ADMIN' }));
    expect(await screen.findByText('Admin turinys')).toBeInTheDocument();
  });
});
