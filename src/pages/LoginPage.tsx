import styled from 'styled-components';

/**
 * Centruotas login puslapis su Microsoft mygtuku. Mygtukas naviguoja į
 * backend OAuth start endpoint'ą per full page navigation (NE react-router),
 * nes /api/auth/outlook/login 302 nukreipia į login.microsoftonline.com.
 */
export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/outlook/login';
  };

  return (
    <Wrapper>
      <Card>
        <Title>Darbo vietų rezervavimas</Title>
        <Subtitle>Aplinkos ministerija</Subtitle>

        <LoginButton type="button" onClick={handleLogin}>
          <MicrosoftLogo aria-hidden="true" />
          <span>Prisijungti su Microsoft</span>
        </LoginButton>

        <Hint>Naudokite savo @am.lt paskyrą</Hint>
      </Card>
    </Wrapper>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  padding: ${({ theme }) => theme.ui.spacing.lg};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.xl};
  width: 100%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(41, 52, 111, 0.06);
`;

const Title = styled.h1`
  font-size: 24px;
  color: ${({ theme }) => theme.colors.navy};
  margin-bottom: ${({ theme }) => theme.ui.spacing.xs};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  margin-bottom: ${({ theme }) => theme.ui.spacing.xl};
  font-size: 14px;
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  width: 100%;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.navy};
  color: #fff;
  border: none;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-weight: 500;
  font-size: 15px;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #1f2856;
  }
`;

const Hint = styled.p`
  margin-top: ${({ theme }) => theme.ui.spacing.md};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
`;
