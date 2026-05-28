import styled from 'styled-components';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <Wrapper>
      <h1>404</h1>
      <p>Puslapis nerastas</p>
      <Link to="/">Grįžti į pradžią</Link>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  max-width: 480px;
  margin: 80px auto;
  padding: ${({ theme }) => theme.ui.spacing.xl};
  text-align: center;

  h1 {
    font-size: 64px;
    color: ${({ theme }) => theme.colors.navy};
    margin-bottom: ${({ theme }) => theme.ui.spacing.sm};
  }

  p {
    color: ${({ theme }) => theme.colors.textMute};
    margin-bottom: ${({ theme }) => theme.ui.spacing.lg};
  }
`;
