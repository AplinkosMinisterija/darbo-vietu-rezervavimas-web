import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import RequireAuth from './RequireAuth';
import { AuthProvider } from '../state/auth';
import { theme } from '../styles/theme';
import { makeUser } from '../test/utils';

// Auth state derives entirely from authApi.me() — mock the api module.
vi.mock('../api/auth', () => ({
  authApi: { me: vi.fn(), logout: vi.fn() },
}));
import { authApi } from '../api/auth';
const meMock = vi.mocked(authApi.me);

function renderGate() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/secret']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/secret"
              element={
                <RequireAuth>
                  <div>Slaptas turinys</div>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<div>Prisijungimo puslapis</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => meMock.mockReset());

  it('shows a loading placeholder while the /me probe is pending', async () => {
    // Deferred (not a never-resolving promise) so nothing dangles after the test
    // — a permanently-pending mock blocks Vitest from exiting.
    let resolveMe!: (u: ReturnType<typeof makeUser>) => void;
    meMock.mockReturnValue(new Promise((r) => { resolveMe = r; }));
    renderGate();
    expect(screen.getByText('Kraunama…')).toBeInTheDocument();
    expect(screen.queryByText('Slaptas turinys')).not.toBeInTheDocument();
    // Settle so the provider leaves the loading state cleanly.
    resolveMe(makeUser());
    expect(await screen.findByText('Slaptas turinys')).toBeInTheDocument();
  });

  it('renders children once an authenticated user is loaded', async () => {
    meMock.mockResolvedValue(makeUser());
    renderGate();
    expect(await screen.findByText('Slaptas turinys')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login (me() rejects)', async () => {
    meMock.mockRejectedValueOnce(new Error('401'));
    renderGate();
    expect(await screen.findByText('Prisijungimo puslapis')).toBeInTheDocument();
    expect(screen.queryByText('Slaptas turinys')).not.toBeInTheDocument();
  });
});
