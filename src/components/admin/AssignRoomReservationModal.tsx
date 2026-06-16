import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import styled from 'styled-components';
import Modal, { PrimaryButton, SecondaryButton } from '../Modal';
import { adminApi } from '../../api/admin';
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../Toast';
import { todayYmd } from '../../lib/dates';
import UserSearchPicker from './UserSearchPicker';
import type { Room, User } from '../../types';

interface Props {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}

type AssignMode = 'single' | 'recurring';

/** ISO weekday (1=Mon … 5=Fri) → trumpas LT žymėjimas. */
const WEEKDAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'Pr' },
  { value: 2, label: 'An' },
  { value: 3, label: 'Tr' },
  { value: 4, label: 'Kt' },
  { value: 5, label: 'Pn' },
];

const WEEKS_OPTIONS: readonly number[] = [1, 2, 4, 8, 12];

const schema = Yup.object({
  mode: Yup.mixed<AssignMode>().oneOf(['single', 'recurring']).required(),
  // Vienkartiniu režimu darbo vieta privaloma; kartojant — nebūtina (auto).
  deskNumber: Yup.number()
    .transform((value, original) => (original === '' || original == null ? undefined : value))
    .typeError('Įvesk darbo vietos numerį')
    .integer('Sveikas skaičius')
    .min(1, 'Darbo vieta ≥ 1')
    .when('mode', {
      is: 'single',
      then: (s) => s.required('Įvesk darbo vietą'),
      otherwise: (s) => s.optional(),
    }),
  date: Yup.string().when('mode', {
    is: 'single',
    then: (s) => s.required('Pasirink datą'),
    otherwise: (s) => s.optional(),
  }),
  weekdays: Yup.array(Yup.number().required()).when('mode', {
    is: 'recurring',
    then: (s) => s.min(1, 'Pasirink bent vieną savaitės dieną'),
    otherwise: (s) => s.optional(),
  }),
  weeks: Yup.number().required(),
});

/**
 * Manageris priskiria rezervaciją FIKSUOTAI patalpai (savo valdomai). Skiriasi
 * nuo AssignReservationModal tuo, kad patalpa nerenkama — paduodama per `room`
 * prop'ą. Darbo vieta ribota `room.deskCount`, data ≥ šiandien. BE klaidos
 * (DESK_TAKEN, INVALID_DESK_NUMBER, DATE_IN_PAST, USER_HAS_RESERVATION)
 * map'inamos į laukų klaidas.
 */
export default function AssignRoomReservationModal({ open, room, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      mode: 'single' as AssignMode,
      deskNumber: '' as number | '',
      date: todayYmd(),
      weekdays: [] as number[],
      weeks: 4,
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!room) return;
      if (!selectedUser) {
        setUserError('Pasirink vartotoją');
        return;
      }
      try {
        if (values.mode === 'recurring') {
          const r = await adminApi.reservations.assignRecurring({
            userId: selectedUser.id,
            roomId: room.id,
            deskNumber:
              values.deskNumber === '' ? undefined : Number(values.deskNumber),
            weekdays: values.weekdays,
            weeks: Number(values.weeks),
          });
          toast.success(
            `Sukurta ${r.created} rez. (praleista ${r.skippedExisting}, be vietos ${r.noDesk})`,
          );
          onSuccess();
          reset();
          onClose();
          return;
        }
        await adminApi.reservations.assign({
          userId: selectedUser.id,
          roomId: room.id,
          deskNumber: Number(values.deskNumber),
          date: values.date,
        });
        toast.success('Rezervacija priskirta');
        onSuccess();
        reset();
        onClose();
      } catch (err) {
        const code = adminErrorCode(err);
        if (code === 'DESK_TAKEN' || code === 'INVALID_DESK_NUMBER') {
          helpers.setFieldError('deskNumber', adminErrorMessage(err));
        } else if (code === 'DATE_IN_PAST') {
          helpers.setFieldError('date', adminErrorMessage(err));
        } else if (code === 'USER_HAS_RESERVATION' || code === 'USER_NOT_FOUND') {
          setUserError(adminErrorMessage(err));
        } else {
          toast.error(adminErrorMessage(err));
        }
      }
    },
  });

  function reset() {
    formik.resetForm();
    setSelectedUser(null);
    setUserError(null);
  }

  function handleClose() {
    if (formik.isSubmitting) return;
    reset();
    onClose();
  }

  const isRecurring = formik.values.mode === 'recurring';

  function toggleWeekday(day: number) {
    const next = formik.values.weekdays.includes(day)
      ? formik.values.weekdays.filter((d) => d !== day)
      : [...formik.values.weekdays, day].sort((a, b) => a - b);
    void formik.setFieldValue('weekdays', next);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={room ? `Priskirti rezervaciją · ${room.number}` : 'Priskirti rezervaciją'}
      footer={
        <>
          <SecondaryButton type="button" onClick={handleClose} disabled={formik.isSubmitting}>
            Atšaukti
          </SecondaryButton>
          <PrimaryButton
            type="button"
            onClick={() => formik.handleSubmit()}
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? 'Priskiriama…' : 'Priskirti'}
          </PrimaryButton>
        </>
      }
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          formik.handleSubmit();
        }}
      >
        <Field>
          <FieldLabel>Režimas</FieldLabel>
          <ModeToggle role="radiogroup" aria-label="Priskyrimo režimas">
            <ModeOption
              type="button"
              role="radio"
              aria-checked={!isRecurring}
              $active={!isRecurring}
              disabled={formik.isSubmitting}
              onClick={() => void formik.setFieldValue('mode', 'single')}
            >
              Vienkartinė data
            </ModeOption>
            <ModeOption
              type="button"
              role="radio"
              aria-checked={isRecurring}
              $active={isRecurring}
              disabled={formik.isSubmitting}
              onClick={() => void formik.setFieldValue('mode', 'recurring')}
            >
              Kartoti savaitės dienomis
            </ModeOption>
          </ModeToggle>
        </Field>

        <Field>
          <FieldLabel>Vartotojas *</FieldLabel>
          <UserSearchPicker
            selected={selectedUser}
            disabled={formik.isSubmitting}
            onSelect={(u) => {
              setSelectedUser(u);
              setUserError(null);
            }}
            onClear={() => setSelectedUser(null)}
          />
          {userError && <FieldError>{userError}</FieldError>}
        </Field>

        <Row>
          <Field>
            <FieldLabel>
              {isRecurring ? 'Darbo vieta (nebūtina — auto)' : 'Darbo vieta *'}
              {room ? ` (1–${room.deskCount})` : ''}
            </FieldLabel>
            <FieldInput
              type="number"
              name="deskNumber"
              min={1}
              max={room?.deskCount}
              value={formik.values.deskNumber}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
              placeholder={isRecurring ? 'auto' : undefined}
            />
            {formik.touched.deskNumber && formik.errors.deskNumber && (
              <FieldError>{formik.errors.deskNumber}</FieldError>
            )}
          </Field>

          {!isRecurring && (
            <Field>
              <FieldLabel>Data *</FieldLabel>
              <FieldInput
                type="date"
                name="date"
                min={todayYmd()}
                value={formik.values.date}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={formik.isSubmitting}
              />
              {formik.touched.date && formik.errors.date && (
                <FieldError>{formik.errors.date}</FieldError>
              )}
            </Field>
          )}
        </Row>

        {isRecurring && (
          <>
            <Field>
              <FieldLabel>Savaitės dienos *</FieldLabel>
              <WeekdayRow>
                {WEEKDAY_OPTIONS.map((w) => (
                  <WeekdayChip
                    key={w.value}
                    type="button"
                    role="checkbox"
                    aria-checked={formik.values.weekdays.includes(w.value)}
                    $active={formik.values.weekdays.includes(w.value)}
                    disabled={formik.isSubmitting}
                    onClick={() => toggleWeekday(w.value)}
                  >
                    {w.label}
                  </WeekdayChip>
                ))}
              </WeekdayRow>
              {formik.touched.weekdays && typeof formik.errors.weekdays === 'string' && (
                <FieldError>{formik.errors.weekdays}</FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel>Savaičių</FieldLabel>
              <FieldSelect
                name="weeks"
                value={formik.values.weeks}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={formik.isSubmitting}
              >
                {WEEKS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </FieldSelect>
            </Field>
          </>
        )}
      </Form>
    </Modal>
  );
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;

const FieldInput = styled.input`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  width: 100%;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const FieldError = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
`;

const FieldSelect = styled.select`
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.surface};
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.brand};
  }
`;

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;

const ModeToggle = styled.div`
  display: flex;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  overflow: hidden;
`;

const ModeOption = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 10px;
  font-size: 13px;
  border: none;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.colors.brand : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? '#fff' : theme.colors.text)};
  & + & {
    border-left: 1px solid ${({ theme }) => theme.colors.border};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
