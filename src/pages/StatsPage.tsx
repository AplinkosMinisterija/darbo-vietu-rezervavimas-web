import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { statsApi } from '../api/stats';
import { humanDate, todayYmd } from '../lib/dates';
import type { StatsByFloor } from '../types';

/**
 * Apžvalga — per-floor užimtumas. Progress bar'as:
 *   - <60% → žalia
 *   - 60-90% → geltona
 *   - >90% → raudona
 * Total = sum'a per floors.
 */
export default function StatsPage() {
  const [date, setDate] = useState<string>(todayYmd());
  const [data, setData] = useState<StatsByFloor | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setData(null);
    statsApi
      .byFloor(date)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const floors = data
    ? Object.keys(data)
        .map((k) => ({ floor: k, ...data[k] }))
        .sort((a, b) => Number(a.floor) - Number(b.floor))
    : [];

  const total = floors.reduce(
    (acc, f) => ({ total: acc.total + f.total, reserved: acc.reserved + f.reserved }),
    { total: 0, reserved: 0 },
  );

  return (
    <Wrapper>
      <Head>
        <h2>Apžvalga</h2>
        <DatePicker>
          <label htmlFor="stats-date">Data:</label>
          <input
            id="stats-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayYmd())}
          />
        </DatePicker>
      </Head>

      <DateLabel>{humanDate(date)}</DateLabel>

      {!!error && <Muted>Nepavyko užkrauti statistikų. Bandyk vėliau.</Muted>}
      {!error && !data && <Muted>Kraunama…</Muted>}

      {data && (
        <>
          <SummaryCard>
            <span>Iš viso ministerijoje</span>
            <SummaryValue>
              {total.reserved} / {total.total} vietų užimta
            </SummaryValue>
          </SummaryCard>

          <FloorList>
            {floors.length === 0 && <Muted>Statistikos nėra.</Muted>}
            {floors.map((f) => {
              const ratio = f.total > 0 ? f.reserved / f.total : 0;
              const tone: 'ok' | 'warn' | 'full' =
                ratio >= 0.9 ? 'full' : ratio >= 0.6 ? 'warn' : 'ok';
              return (
                <FloorRow key={f.floor}>
                  <RowHead>
                    <FloorName>{f.floor} aukštas</FloorName>
                    <FloorNum>
                      {f.reserved} / {f.total}
                    </FloorNum>
                  </RowHead>
                  <Bar>
                    <Fill
                      $tone={tone}
                      style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                    />
                  </Bar>
                </FloorRow>
              );
            })}
          </FloorList>
        </>
      )}
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

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  flex-wrap: wrap;
`;

const DatePicker = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  font-size: 14px;

  input {
    padding: 6px 10px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.ui.radius};
    font-family: inherit;
  }
`;

const DateLabel = styled.div`
  font-size: 15px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const SummaryCard = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.ui.spacing.md};
  font-size: 15px;
`;

const SummaryValue = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.navy};
  font-size: 17px;
`;

const FloorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const FloorRow = styled.div`
  padding: ${({ theme }) => theme.ui.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
`;

const RowHead = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
`;

const FloorName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const FloorNum = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
`;

const Bar = styled.div`
  height: 10px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  overflow: hidden;
`;

const Fill = styled.div<{ $tone: 'ok' | 'warn' | 'full' }>`
  height: 100%;
  background: ${({ theme, $tone }) =>
    $tone === 'ok'
      ? theme.colors.success
      : $tone === 'warn'
        ? theme.colors.warning
        : theme.colors.danger};
  transition: width 0.2s ease;
`;

const Muted = styled.p`
  color: ${({ theme }) => theme.colors.textMute};
  margin: 0;
`;
