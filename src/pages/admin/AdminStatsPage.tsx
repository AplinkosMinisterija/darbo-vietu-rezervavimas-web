import { useEffect, useId, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { statsApi } from '../../api/stats';
import type { AdminStats } from '../../types';
import { bucketDays, weekdayProfile, type Granularity } from '../../lib/statsBuckets';
import { addDays, formatYmd, humanDate, parseYmd, todayYmd } from '../../lib/dates';
import { adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  FilterBar,
  FilterGroup,
  FilterInput,
  FilterLabel,
  Muted,
  PageHeader,
  PageTitle,
  Table,
  TableWrapper,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from './shared';

/**
 * Grafiko spalvos — chart-only tokenai. `reserved` yra tamsesnis brand-mint
 * žingsnis (#3D9C67, 3.41:1 vs balta — ≥3:1 non-text kontrastas; pats
 * theme.colors.brand #5FBD86 tesiekia 2.31:1). `track` – NE kategorinė
 * serija, o „liko laisva“ fonas (furniture), todėl sąmoningai neutralus.
 */
const CHART = {
  reserved: '#3D9C67',
  track: '#E5E7EB',
  trackBorder: '#D1D5DB',
  grid: '#EEF0F3',
  axis: '#6B7280',
};

type PresetId = 'day' | 'week' | 'month' | '30d' | 'all';

const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'day', label: 'Diena' },
  { id: 'week', label: 'Savaitė' },
  { id: 'month', label: 'Mėnuo' },
  { id: '30d', label: '30 d.' },
  { id: 'all', label: 'Visas laikotarpis' },
];

const GRANULARITIES: { id: Granularity; label: string }[] = [
  { id: 'day', label: 'Diena' },
  { id: 'week', label: 'Savaitė' },
  { id: 'month', label: 'Mėnuo' },
];

function presetRange(id: PresetId, range: AdminStats['range'] | null): { from: string; to: string } {
  const today = todayYmd();
  switch (id) {
    case 'day':
      return { from: today, to: today };
    case 'week':
      return { from: formatYmd(addDays(parseYmd(today), -6)), to: today };
    case 'month':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case '30d':
      return { from: formatYmd(addDays(parseYmd(today), -29)), to: today };
    case 'all': {
      const from = range?.minDate ?? today;
      // maxDate gali būti ateityje (pasikartojančios rezervacijos) — imame vėlesnę.
      const max = range?.maxDate ?? today;
      return { from, to: max > today ? max : today };
    }
  }
}

const pct1 = (numerator: number, denominator: number): number =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;

/**
 * Admin užimtumo statistika: laikotarpio pasirinkimas (preset'ai + laisvas
 * nuo–iki), granuliacija be refetch'o (bucketing'as FE pusėje iš per-day
 * serijos), KPI kortelės, grafikai ir Excel eksportas tam pačiam intervalui.
 */
export default function AdminStatsPage() {
  const toast = useToast();
  const fromId = useId();
  const toId = useId();

  const initial = presetRange('30d', null);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const rangeInvalid = from > to;

  useEffect(() => {
    if (rangeInvalid) return;
    // Cancelled flag — greitai kaitaliojant laikotarpį lėtesnis ankstesnis
    // atsakymas negali perrašyti naujesnio (out-of-order race).
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    statsApi
      .adminStats(from, to)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(adminErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, rangeInvalid]);

  function applyPreset(id: PresetId) {
    const next = presetRange(id, stats?.range ?? null);
    setFrom(next.from);
    setTo(next.to);
    // Ilgiems intervalams dienų stulpeliai nebeįskaitomi — perjungiam patys.
    if (id === 'all') setGranularity('month');
    else setGranularity('day');
  }

  async function handleExport() {
    if (exporting || rangeInvalid) return;
    setExporting(true);
    try {
      await statsApi.downloadAdminXlsx(from, to);
      toast.success('Ataskaita atsisiųsta');
    } catch (err) {
      toast.error(adminErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  const capacity = stats?.capacity ?? 0;
  const periodDays = stats?.days.length ?? 0;

  const buckets = useMemo(
    () => (stats ? bucketDays(stats.days, granularity) : []),
    [stats, granularity],
  );

  const timeRows = useMemo(
    () =>
      buckets.map((b) => {
        const bucketCapacity = capacity * b.dayCount;
        return {
          label: b.label,
          Rezervuota: b.reserved,
          Laisva: Math.max(0, bucketCapacity - b.reserved),
          pct: pct1(b.reserved, bucketCapacity),
        };
      }),
    [buckets, capacity],
  );

  const weekdayRows = useMemo(
    () =>
      (stats ? weekdayProfile(stats.days) : []).map((w) => ({
        label: w.label,
        'Užimtumas %': pct1(w.avgReserved, capacity),
        avgReserved: w.avgReserved,
      })),
    [stats, capacity],
  );

  const floorRows = useMemo(
    () =>
      (stats?.byFloor ?? []).map((f) => ({
        label: `${f.floor} a.`,
        'Užimtumas %': pct1(f.reserved, f.capacity * periodDays),
        reserved: f.reserved,
      })),
    [stats, periodDays],
  );

  return (
    <div>
      <PageHeader>
        <PageTitle>Statistika</PageTitle>
        <ExportButton type="button" onClick={handleExport} disabled={exporting || rangeInvalid}>
          {exporting ? 'Eksportuojama…' : 'Eksportuoti ataskaitą (Excel)'}
        </ExportButton>
      </PageHeader>

      <FilterBar>
        <FilterGroup>
          <FilterLabel as="span">Laikotarpis</FilterLabel>
          <SegmentGroup role="group" aria-label="Laikotarpio pasirinkimas">
            {PRESETS.map((p) => (
              <SegmentButton key={p.id} type="button" onClick={() => applyPreset(p.id)}>
                {p.label}
              </SegmentButton>
            ))}
          </SegmentGroup>
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={fromId}>Nuo</FilterLabel>
          <FilterInput
            id={fromId}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel htmlFor={toId}>Iki</FilterLabel>
          <FilterInput
            id={toId}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </FilterGroup>
        <FilterGroup>
          <FilterLabel as="span">Granuliacija</FilterLabel>
          <SegmentGroup role="group" aria-label="Granuliacija">
            {GRANULARITIES.map((g) => (
              <SegmentButton
                key={g.id}
                type="button"
                aria-pressed={granularity === g.id}
                $active={granularity === g.id}
                onClick={() => setGranularity(g.id)}
              >
                {g.label}
              </SegmentButton>
            ))}
          </SegmentGroup>
        </FilterGroup>
      </FilterBar>

      {rangeInvalid && <EmptyState>Data „Nuo“ negali būti vėlesnė už „Iki“.</EmptyState>}
      {loadError && !rangeInvalid && <EmptyState>{loadError}</EmptyState>}
      {isLoading && !stats && <Muted>Kraunama…</Muted>}

      {stats && !rangeInvalid && !loadError && (
        <>
          <KpiGrid>
            <KpiCard>
              <KpiValue>{stats.kpi.totalReservations}</KpiValue>
              <KpiLabel>Rezervacijos per laikotarpį</KpiLabel>
            </KpiCard>
            <KpiCard>
              <KpiValue>{stats.kpi.workdayAvgOccupancyPct}%</KpiValue>
              <KpiLabel>Vid. užimtumas darbo dienomis</KpiLabel>
            </KpiCard>
            <KpiCard>
              <KpiValue>
                {stats.kpi.reservingUsers}
                <KpiValueSub> iš {stats.kpi.activeUsers}</KpiValueSub>
              </KpiValue>
              <KpiLabel>Naudotojų bent kartą rezervavo</KpiLabel>
            </KpiCard>
            <KpiCard>
              <KpiValue>
                {stats.kpi.peakDay ? (
                  <>
                    {stats.kpi.peakDay.reserved}
                    <KpiValueSub> {humanDate(stats.kpi.peakDay.date)}</KpiValueSub>
                  </>
                ) : (
                  '—'
                )}
              </KpiValue>
              <KpiLabel>Pikinė diena</KpiLabel>
            </KpiCard>
          </KpiGrid>

          {stats.kpi.totalReservations === 0 && (
            <EmptyState>Pasirinktame laikotarpyje rezervacijų nėra.</EmptyState>
          )}

          <ChartCard>
            <ChartTitle>Rezervuota vs laisva</ChartTitle>
            <ChartSub>
              Talpa: {capacity} d. v. per dieną{granularity !== 'day' ? ' (sumuota intervale)' : ''}
            </ChartSub>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: CHART.axis }}
                  interval="preserveStartEnd"
                  minTickGap={16}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: CHART.axis }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as { pct?: number } | undefined;
                    return row?.pct === undefined ? label : `${label} — užimta ${row.pct}%`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Rezervuota" stackId="a" fill={CHART.reserved} maxBarSize={40} />
                <Bar
                  dataKey="Laisva"
                  stackId="a"
                  fill={CHART.track}
                  stroke={CHART.trackBorder}
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
            <details>
              <TableToggle>Rodyti duomenis lentele</TableToggle>
              <TableWrapper>
                <Table>
                  <THead>
                    <TR>
                      <TH>Intervalas</TH>
                      <TH>Rezervuota</TH>
                      <TH>Laisva</TH>
                      <TH>Užimtumas %</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {timeRows.map((r) => (
                      <TR key={r.label}>
                        <TD>{r.label}</TD>
                        <TD>{r.Rezervuota}</TD>
                        <TD>{r.Laisva}</TD>
                        <TD>{r.pct}%</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrapper>
            </details>
          </ChartCard>

          <ChartRow>
            <ChartCard>
              <ChartTitle>Vid. užimtumas pagal savaitės dieną</ChartTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weekdayRows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: CHART.axis }} tickLine={false} />
                  <YAxis
                    unit="%"
                    tick={{ fontSize: 11, fill: CHART.axis }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const row = item?.payload as { avgReserved?: number } | undefined;
                      return [`${value}% (vid. ${row?.avgReserved ?? 0} rez.)`, 'Užimtumas'];
                    }}
                  />
                  <Bar dataKey="Užimtumas %" fill={CHART.reserved} radius={[4, 4, 0, 0]} maxBarSize={40}>
                    <LabelList
                      dataKey="Užimtumas %"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 11, fill: CHART.axis }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard>
              <ChartTitle>Užimtumas pagal aukštą</ChartTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={floorRows}
                  layout="vertical"
                  margin={{ top: 8, right: 40, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    unit="%"
                    tick={{ fontSize: 11, fill: CHART.axis }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12, fill: CHART.axis }}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const row = item?.payload as { reserved?: number } | undefined;
                      return [`${value}% (${row?.reserved ?? 0} rez.)`, 'Užimtumas'];
                    }}
                  />
                  <Bar dataKey="Užimtumas %" fill={CHART.reserved} radius={[0, 4, 4, 0]} maxBarSize={28}>
                    <LabelList
                      dataKey="Užimtumas %"
                      position="right"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: 11, fill: CHART.axis }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </ChartRow>

          <ChartCard>
            <ChartTitle>Populiariausi kabinetai</ChartTitle>
            {stats.topRooms.length === 0 ? (
              <Muted>Nėra duomenų.</Muted>
            ) : (
              <TableWrapper>
                <Table>
                  <THead>
                    <TR>
                      <TH>Kabinetas</TH>
                      <TH>Darbo vietų</TH>
                      <TH>Rezervacijų</TH>
                      <TH>Užimtumas %</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {stats.topRooms.map((r) => (
                      <TR key={r.roomId}>
                        <TD>
                          {r.number}
                          {r.name ? ` — ${r.name}` : ''}
                        </TD>
                        <TD>{r.deskCount}</TD>
                        <TD>{r.reserved}</TD>
                        <TD>{pct1(r.reserved, r.deskCount * periodDays)}%</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrapper>
            )}
          </ChartCard>

          <Muted>
            Pastaba: talpa skaičiuojama pagal dabartinę kabinetų konfigūraciją, todėl senų
            laikotarpių užimtumo % gali būti netikslus, jei vietų skaičius keitėsi.
          </Muted>
        </>
      )}
    </div>
  );
}

const ExportButton = styled.button`
  padding: ${({ theme }) => `${theme.ui.spacing.sm} ${theme.ui.spacing.md}`};
  border: 1px solid ${({ theme }) => theme.colors.brand};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  background: ${({ theme }) => theme.colors.brand};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SegmentGroup = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const SegmentButton = styled.button<{ $active?: boolean }>`
  padding: 6px 10px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.brand : theme.colors.border)};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  background: ${({ theme, $active }) => ($active ? theme.colors.brand : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.ui.spacing.md};
  margin: ${({ theme }) => `${theme.ui.spacing.md} 0`};

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const KpiCard = styled.div`
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
`;

const KpiValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.navy};
  line-height: 1.2;
`;

const KpiValueSub = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.textMute};
`;

const KpiLabel = styled.div`
  margin-top: 4px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.ui.spacing.md};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  padding: ${({ theme }) => theme.ui.spacing.md};
  margin-bottom: ${({ theme }) => theme.ui.spacing.md};
  min-width: 0;
`;

const ChartTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text};
`;

const ChartSub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  margin-bottom: ${({ theme }) => theme.ui.spacing.sm};
`;

const TableToggle = styled.summary`
  cursor: pointer;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
  margin: ${({ theme }) => `${theme.ui.spacing.sm} 0`};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;
