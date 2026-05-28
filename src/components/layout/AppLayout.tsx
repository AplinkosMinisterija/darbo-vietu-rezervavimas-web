import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import NavBar from './NavBar';

/**
 * Application shell autentikuotiems vartotojams. NavBar (top) + outlet
 * vidiniame container'yje. Admin nesusijusiems sidebar'ams žiūrėk
 * `<AdminLayout>`.
 */
export default function AppLayout() {
  return (
    <Wrapper>
      <NavBar />
      <Main>
        <Outlet />
      </Main>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: ${({ theme }) => theme.ui.spacing.lg};
`;
