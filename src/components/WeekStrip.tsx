import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  SHORT_WEEKDAY_LT,
  addDays,
  formatYmd,
  isPastDate,
  isWeekend,
  parseYmd,
  startOfWeek,
  todayYmd,
} from '../lib/dates';

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
}

/**
 * Savaitės juosta — 7 dienos (Pr→S). Past + weekend = disabled. Selected =
 * navy bg. Internal `weekStart` slankioja per ← / → mygtukus, bet automatiškai
 * resync'inasi kai `selectedDate` keliauja į kitą savaitę (pvz. iš kalendoriaus).
 */
export default function WeekStrip({ selectedDate, onSelect }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(parseYmd(selectedDate)));

  useEffect(() => {
    const expected = startOfWeek(parseYmd(selectedDate));
    if (formatYmd(expected) !== formatYmd(weekStart)) {
      setWeekStart(expected);
    }
    // intentional: weekStart depend tracking būtų loop'as
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Wrapper>
      <NavButton
        type="button"
        aria-label="Ankstesnė savaitė"
        onClick={() => setWeekStart(addDays(weekStart, -7))}
      >
        ←
      </NavButton>

      <Days>
        {days.map((d, idx) => {
          const ymd = formatYmd(d);
          const disabled = isWeekend(d) || isPastDate(ymd);
          const selected = ymd === selectedDate;
          const isToday = ymd === todayYmd();
          return (
            <DayButton
              key={ymd}
              type="button"
              disabled={disabled}
              $selected={selected}
              $today={isToday}
              onClick={() => !disabled && onSelect(ymd)}
              aria-pressed={selected}
            >
              <DayName>{SHORT_WEEKDAY_LT[idx]}</DayName>
              <DayNum>{d.getDate()}</DayNum>
            </DayButton>
          );
        })}
      </Days>

      <NavButton
        type="button"
        aria-label="Kita savaitė"
        onClick={() => setWeekStart(addDays(weekStart, 7))}
      >
        →
      </NavButton>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const NavButton = styled.button`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radius};
  width: 40px;
  font-size: 18px;
  color: ${({ theme }) => theme.colors.text};
  &:hover {
    background: ${({ theme }) => theme.colors.bg};
  }
`;

const Days = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.ui.spacing.sm};

  @media (max-width: 768px) {
    gap: 4px;
  }
`;

const DayButton = styled.button<{ $selected: boolean; $today: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: ${({ theme }) => `${theme.ui.spacing.sm} ${theme.ui.spacing.xs}`};
  border-radius: ${({ theme }) => theme.ui.radius};
  border: 1px solid
    ${({ theme, $today, $selected }) =>
      $selected ? theme.colors.navy : $today ? theme.colors.brand : theme.colors.border};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.navy : theme.colors.surface};
  color: ${({ theme, $selected }) => ($selected ? '#fff' : theme.colors.text)};
  font-family: inherit;
  min-height: 56px;
  transition: background 0.12s ease;

  &:hover:not(:disabled) {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.navy : theme.colors.bg};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.textMute};
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 768px) {
    min-height: 48px;
    padding: 4px;
  }
`;

const DayName = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 500;
  opacity: 0.8;
`;

const DayNum = styled.span`
  font-size: 17px;
  font-weight: 600;
`;
