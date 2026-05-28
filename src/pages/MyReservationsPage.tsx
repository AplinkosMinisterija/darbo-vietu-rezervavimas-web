import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import CancelModal from '../components/CancelModal';
import { reservationsApi } from '../api/reservations';
import { humanDate, isPastDate } from '../lib/dates';
import type { MyReservation } from '../types';

/**
 * Mano rezervacijos sąrašas. Tik vartotojo rezervacijos, atskirta nuo
 * home page (kuri rodo per-day grid'ą). Lentelė be table elementų — paprastas
 * card layout'as, kad lengviau atrodytų mobile'e.
 */
export default function MyReservationsPage() {
  const [items, setItems] = useState<MyReservation[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    date: string;
    deskNumber: number;
    roomLabel: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await reservationsApi.mine();
      // Newest first (createdAt desc)
      data.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      setItems(data);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <Wrapper>
        <h2>Mano rezervacijos</h2>
        <Muted>Nepavyko užkrauti rezervacijų. Bandyk vėliau.</Muted>
      </Wrapper>
    );
  }

  if (!items) {
    return (
      <Wrapper>
        <h2>Mano rezervacijos</h2>
        <Muted>Kraunama…</Muted>
      </Wrapper>
    );
  }

  if (items.length === 0) {
    return (
      <Wrapper>
        <h2>Mano rezervacijos</h2>
        <Empty>Tu neturi rezervacijų.</Empty>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <h2>Mano rezervacijos</h2>
      <List>
        {items.map((r) => {
          const past = isPastDate(r.date);
          return (
            <Item key={r.id} $past={past}>
              <Col>
                <DateLine>{humanDate(r.date)}</DateLine>
                <Sub>
                  Kab. {r.room.number}
                  {r.room.name && ` · ${r.room.name}`} · Vieta {r.deskNumber}
                </Sub>
                <Sub>{r.room.floor} aukštas</Sub>
              </Col>
              <Col $right>
                {past ? (
                  <PastTag>įvykusi</PastTag>
                ) : (
                  <CancelBtn
                    type="button"
                    onClick={() =>
                      setCancelTarget({
                        id: r.id,
                        date: r.date,
                        deskNumber: r.deskNumber,
                        roomLabel: `${r.room.number}${r.room.name ? ` · ${r.room.name}` : ''}`,
                      })
                    }
                  >
                    Atšaukti
                  </CancelBtn>
                )}
              </Col>
            </Item>
          );
        })}
      </List>

      <CancelModal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        reservation={cancelTarget}
        onSuccess={load}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.lg};

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.navy};
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const Item = styled.div<{ $past: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
  padding: ${({ theme }) => theme.ui.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  opacity: ${({ $past }) => ($past ? 0.7 : 1)};
`;

const Col = styled.div<{ $right?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: ${({ $right }) => ($right ? 'flex-end' : 'flex-start')};
  justify-content: center;
`;

const DateLine = styled.span`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
`;

const Sub = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const CancelBtn = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.colors.danger};
  border: 1px solid ${({ theme }) => theme.colors.danger};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.ui.radius};
  font-size: 13px;
  &:hover { background: ${({ theme }) => theme.colors.danger}; color: #fff; }
`;

const PastTag = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  font-style: italic;
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.xl};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  color: ${({ theme }) => theme.colors.textMute};
  text-align: center;
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  margin: 0;
`;
