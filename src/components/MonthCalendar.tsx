import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  MONTH_NAMES_LT,
  SHORT_WEEKDAY_LT,
  addDays,
  addMonths,
  formatYmd,
  isPastDate,
  isWeekend,
  parseYmd,
  startOfWeek,
} from '../lib/dates';

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  onSelect: (date: string) => void;
}

/**
 * Popover'inis mėnesio kalendorius. Render'inasi tik kai `open=true`, kad
 * nepridėtume DOM bagažo home page'e. Past/weekend = disabled.
 */
export default function MonthCalendar({ open, onClose, selectedDate, onSelect }: Props) {
  const [cursor, setCursor] = useState<Date>(() => parseYmd(selectedDate));

  useEffect(() => {
    if (open) setCursor(parseYmd(selectedDate));
  }, [open, selectedDate]);

  if (!open) return null;

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStart = new Date(year, month, 1);
  const gridStart = startOfWeek(monthStart);
  // Always render 6 rows = 42 cells (handles longest possible month layout).
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  return (
    <Backdrop onClick={onClose}>
      <Popup onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pasirinkite datą">
        <Header>
          <NavBtn
            type="button"
            aria-label="Ankstesnis mėnuo"
            onClick={() => setCursor(addMonths(cursor, -1))}
          >
            ←
          </NavBtn>
          <MonthLabel>
            {MONTH_NAMES_LT[month]} {year}
          </MonthLabel>
          <NavBtn
            type="button"
            aria-label="Kitas mėnuo"
            onClick={() => setCursor(addMonths(cursor, 1))}
          >
            →
          </NavBtn>
        </Header>

        <DayNames>
          {SHORT_WEEKDAY_LT.map((d) => (
            <DayName key={d}>{d}</DayName>
          ))}
        </DayNames>

        <Grid>
          {cells.map((d) => {
            const ymd = formatYmd(d);
            const inMonth = d.getMonth() === month;
            const disabled = isWeekend(d) || isPastDate(ymd);
            const selected = ymd === selectedDate;
            return (
              <Cell
                key={ymd}
                type="button"
                disabled={disabled}
                $selected={selected}
                $muted={!inMonth}
                onClick={() => {
                  if (disabled) return;
                  onSelect(ymd);
                  onClose();
                }}
              >
                {d.getDate()}
              </Cell>
            );
          })}
        </Grid>
      </Popup>
    </Backdrop>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.35);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 16px 16px;
  z-index: 9000;
`;

const Popup = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.ui.radius};
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  padding: ${({ theme }) => theme.ui.spacing.md};
  width: min(360px, 100%);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.sm};
  margin-bottom: ${({ theme }) => theme.ui.spacing.md};
`;

const NavBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  width: 32px;
  height: 32px;
  font-size: 16px;
`;

const MonthLabel = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.colors.navy};
`;

const DayNames = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
`;

const DayName = styled.div`
  text-align: center;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.textMute};
  text-transform: uppercase;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const Cell = styled.button<{ $selected: boolean; $muted: boolean }>`
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  border: 1px solid
    ${({ theme, $selected }) => ($selected ? theme.colors.navy : 'transparent')};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.navy : 'transparent'};
  color: ${({ theme, $selected, $muted }) =>
    $selected ? '#fff' : $muted ? theme.colors.textMute : theme.colors.text};
  font-family: inherit;
  font-size: 14px;
  opacity: ${({ $muted }) => ($muted ? 0.45 : 1)};

  &:hover:not(:disabled) {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.navy : theme.colors.bg};
  }

  &:disabled {
    color: ${({ theme }) => theme.colors.textMute};
    cursor: not-allowed;
    opacity: 0.4;
  }
`;
