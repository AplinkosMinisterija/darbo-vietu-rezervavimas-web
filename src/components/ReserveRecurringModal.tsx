import { useEffect, useState } from 'react';
import styled from 'styled-components';
import type { AxiosError } from 'axios';
import Modal, { PrimaryButton, SecondaryButton } from './Modal';
import { reservationsApi } from '../api/reservations';
import { reservationErrorMessage } from '../lib/errorMessages';
import { humanDate } from '../lib/dates';
import { useToast } from './Toast';
import type { Room } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: Room | null;
  onSuccess: () => void;
}

/** ISO weekday (1=Mon … 5=Fri) → trumpas LT žymėjimas. */
const WEEKDAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'Pr' },
  { value: 2, label: 'An' },
  { value: 3, label: 'Tr' },
  { value: 4, label: 'Kt' },
  { value: 5, label: 'Pn' },
];

const WEEKS_OPTIONS: readonly number[] = [1, 2, 4, 8, 12];

/**
 * Pasikartojanti rezervacija sau (vartotojui). Pasirenki savaitės dienas +
 * kiek savaičių į priekį; kiekvienai dienai BE parenka laisvą vietą.
 *
 * Logika „viskas-arba-nieko": jei nors viena pažymėta diena pilna (arba tą
 * dieną jau turi rezervaciją), serveris grąžina 409 su konkrečiomis datomis,
 * ir NIEKAS nesukuriama. Tas dienas parodom žinutėje.
 */
export default function ReserveRecurringModal({ open, onClose, room, onSuccess }: Props) {
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState<number>(4);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Reset to defaults each time the modal opens.
  useEffect(() => {
    if (open) {
      setWeekdays([]);
      setWeeks(4);
      setSubmitting(false);
    }
  }, [open]);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  async function handleConfirm() {
    if (!room || weekdays.length === 0) return;
    setSubmitting(true);
    try {
      const result = await reservationsApi.reserveRecurring({ roomId: room.id, weekdays, weeks });
      toast.success(`Sukurta rezervacijų: ${result.created}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(recurringErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !!room && weekdays.length > 0 && !submitting;

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Rezervuoti pasikartojančiai"
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={submitting}>
            Uždaryti
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleConfirm} disabled={!canSubmit}>
            {submitting ? 'Rezervuojama…' : 'Rezervuoti'}
          </PrimaryButton>
        </>
      }
    >
      {room && (
        <Form>
          <Line>
            <Label>Kabinetas</Label>
            <Value>
              {room.number}
              {room.name && ` · ${room.name}`}
            </Value>
          </Line>

          <Field>
            <FieldLabel>Savaitės dienos *</FieldLabel>
            <WeekdayRow>
              {WEEKDAY_OPTIONS.map((w) => (
                <WeekdayChip
                  key={w.value}
                  type="button"
                  role="checkbox"
                  aria-checked={weekdays.includes(w.value)}
                  $active={weekdays.includes(w.value)}
                  disabled={submitting}
                  onClick={() => toggleWeekday(w.value)}
                >
                  {w.label}
                </WeekdayChip>
              ))}
            </WeekdayRow>
          </Field>

          <Field>
            <FieldLabel>Savaičių į priekį</FieldLabel>
            <FieldSelect
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              disabled={submitting}
            >
              {WEEKS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </FieldSelect>
          </Field>

          <Hint>
            Kiekvienai dienai bus parinkta laisva vieta. Jei nors viena pažymėta diena bus pilna —
            rezervacija nebus sukurta ir parodysime, kurios dienos užimtos.
          </Hint>
        </Form>
      )}
    </Modal>
  );
}

/**
 * RECURRING_CONFLICT žinutė su konkrečiomis datomis (BE grąžina jas `data`
 * lauke). Kitiems kodams — bendras `reservationErrorMessage`.
 */
function recurringErrorMessage(err: unknown): string {
  const ax = err as
    | AxiosError<{ message?: string; type?: string; data?: { full?: string[]; alreadyBooked?: string[] } }>
    | undefined;
  const body = ax?.response?.data;
  if (body?.type === 'RECURRING_CONFLICT') {
    const parts: string[] = [];
    if (body.data?.full?.length) {
      parts.push(`nėra laisvų vietų: ${body.data.full.map(humanDate).join(', ')}`);
    }
    if (body.data?.alreadyBooked?.length) {
      parts.push(`jau turi rezervaciją: ${body.data.alreadyBooked.map(humanDate).join(', ')}`);
    }
    if (parts.length > 0) return `Negalima sukurti — ${parts.join('; ')}`;
    return body.message ?? 'Kai kurioms dienoms nėra laisvų vietų.';
  }
  return reservationErrorMessage(err);
}

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const Line = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const Label = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const Value = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const FieldSelect = styled.select`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  align-self: flex-start;
  min-width: 80px;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const WeekdayRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const WeekdayChip = styled.button<{ $active: boolean }>`
  min-width: 44px;
  padding: 8px 10px;
  font-size: 14px;
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.brand : theme.colors.border)};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.colors.brand : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Hint = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
  line-height: 1.4;
`;
