import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { http } from '../../api/http';
import { colors, ui } from '../../styles/theme';

/**
 * Admin login (username + password).
 *
 * Separate from the Microsoft OAuth flow (`/login`) used by regular @am.lt
 * employees. Admins ALWAYS log in via this page — Microsoft accounts are
 * treated as USER role regardless of email.
 */
function serverMessage(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const data = (err as { response?: { data?: unknown } }).response?.data;
  if (typeof data !== 'object' || data === null) return undefined;
  const message = (data as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await http.post('/auth/admin-login', { username, password });
      window.location.href = '/admin';
    } catch (err: unknown) {
      setError(serverMessage(err) ?? 'Nepavyko prisijungti — patikrink kredencialus.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <Card>
        <Header>
          <Title>Administratoriaus prisijungimas</Title>
          <Subtitle>
            Eilinis @am.lt darbuotojas — naudokis{' '}
            <BackLink onClick={() => navigate('/login')}>Microsoft prisijungimu</BackLink>.
          </Subtitle>
        </Header>

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="username">Vartotojo vardas</Label>
            <Input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <Field>
            <Label htmlFor="password">Slaptažodis</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={busy}
            />
          </Field>

          {error && <ErrorBox>{error}</ErrorBox>}

          <SubmitButton type="submit" disabled={busy || !username || !password}>
            {busy ? 'Tikrinama...' : 'Prisijungti'}
          </SubmitButton>
        </Form>

        <Footer>
          Šis prisijungimas auditojamas — kiekvienas bandymas (sėkmingas ar ne) fiksuojamas.
        </Footer>
      </Card>
    </Page>
  );
}

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.bg};
  padding: ${ui.spacing.lg};
`;

const Card = styled.div`
  background: ${colors.surface};
  border: 1px solid ${colors.border};
  border-radius: ${ui.radius};
  padding: ${ui.spacing.xl};
  max-width: 420px;
  width: 100%;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
`;

const Header = styled.div`
  margin-bottom: ${ui.spacing.lg};
`;

const Title = styled.h1`
  margin: 0 0 ${ui.spacing.sm};
  font-size: 22px;
  color: ${colors.navy};
  font-weight: 600;
`;

const Subtitle = styled.div`
  font-size: 13px;
  color: ${colors.textMute};
  line-height: 1.5;
`;

const BackLink = styled.a`
  color: ${colors.brand};
  cursor: pointer;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${ui.spacing.md};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-size: 13px;
  color: ${colors.text};
  font-weight: 500;
`;

const Input = styled.input`
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  border: 1px solid ${colors.border};
  border-radius: ${ui.radiusSm};
  background: ${colors.surface};
  color: ${colors.text};
  &:focus {
    outline: none;
    border-color: ${colors.brand};
    box-shadow: 0 0 0 3px ${colors.brand}33;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled.button`
  padding: 11px 16px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  background: ${colors.navy};
  color: white;
  border: none;
  border-radius: ${ui.radiusSm};
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${colors.navy};
    filter: brightness(1.1);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorBox = styled.div`
  padding: 10px 12px;
  background: ${colors.danger}15;
  border: 1px solid ${colors.danger}40;
  color: ${colors.danger};
  border-radius: ${ui.radiusSm};
  font-size: 13px;
`;

const Footer = styled.div`
  margin-top: ${ui.spacing.lg};
  padding-top: ${ui.spacing.md};
  border-top: 1px solid ${colors.border};
  font-size: 11px;
  color: ${colors.textMute};
  line-height: 1.5;
`;
