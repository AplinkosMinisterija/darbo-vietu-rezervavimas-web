import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import styled from 'styled-components';
import Modal, { PrimaryButton, SecondaryButton } from '../Modal';
import { adminApi, type AdminReservation } from '../../api/admin';
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../Toast';
import { useRooms } from '../../state/rooms';
import type { User } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Iškviečiama po sėkmingo priskyrimo. Vienkartiniu režimu gauna sukurtą
   * rezervaciją; kartojant savaitės dienomis — be argumento (sukuriama daug).
   */
  onSuccess: (created?: AdminReservation) => void;
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

/** Local YYYY-MM-DD (today) for the date input's min + default. */
function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const schema = Yup.object({
  mode: Yup.mixed<AssignMode>().oneOf(['single', 'recurring']).required(),
  roomId: Yup.string().required('Pasirink patalpą'),
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
 * Admin priskiria rezervaciją pasirinktam vartotojui (override — nepriklauso
 * nuo to, ar vartotojas priskirtas tai patalpai). Vartotojo paieška per
 * /users?q=… (debounce 300ms), patalpa iš bendro rooms store, darbo vieta
 * ribota patalpos deskCount, data ≥ šiandien. BE klaidos (USER_HAS_RESERVATION,
 * DESK_TAKEN, INVALID_DESK_NUMBER, DATE_IN_PAST) map'inamos į laukų klaidas.
 */
export default function AssignReservationModal({ open, onClose, onSuccess }: Props) {
  const toast = useToast();
  const { rooms } = useRooms();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number, 'lt', { numeric: true })),
    [rooms],
  );

  const formik = useFormik({
    initialValues: {
      mode: 'single' as AssignMode,
      roomId: '',
      deskNumber: '' as number | '',
      date: todayYmd(),
      weekdays: [] as number[],
      weeks: 4,
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!selectedUser) {
        setUserError('Pasirink vartotoją');
        return;
      }
      try {
        if (values.mode === 'recurring') {
          const r = await adminApi.reservations.assignRecurring({
            userId: selectedUser.id,
            roomId: values.roomId,
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
        const created = await adminApi.reservations.assign({
          userId: selectedUser.id,
          roomId: values.roomId,
          deskNumber: Number(values.deskNumber),
          date: values.date,
        });
        toast.success('Rezervacija priskirta');
        onSuccess(created);
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

  // Debounced user search (only while no user is selected).
  useEffect(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (selectedUser || userQuery.trim().length === 0) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      setSearching(true);
      void adminApi.users
        .list({ q: userQuery.trim(), limit: 6 })
        .then((r) => setResults(r.items))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [userQuery, selectedUser]);

  function reset() {
    formik.resetForm();
    setSelectedUser(null);
    setUserError(null);
    setUserQuery('');
    setResults([]);
  }

  function handleClose() {
    if (formik.isSubmitting) return;
    reset();
    onClose();
  }

  function pickUser(u: User) {
    setSelectedUser(u);
    setUserError(null);
    setResults([]);
    setUserQuery('');
  }

  const selectedRoom = sortedRooms.find((r) => r.id === formik.values.roomId);
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
      title="Priskirti rezervaciją"
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
          {selectedUser ? (
            <Chip>
              <span>
                {selectedUser.displayName}
                <ChipSub> · {selectedUser.email}</ChipSub>
              </span>
              <ChipClear
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setUserQuery('');
                }}
              >
                keisti
              </ChipClear>
            </Chip>
          ) : (
            <UserSearchWrap>
              <FieldInput
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="Ieškoti pagal vardą ar el. paštą…"
                autoComplete="off"
              />
              {(results.length > 0 || searching) && (
                <Results>
                  {searching && results.length === 0 ? (
                    <ResultEmpty>Ieškoma…</ResultEmpty>
                  ) : (
                    results.map((u) => (
                      <ResultItem key={u.id} type="button" onClick={() => pickUser(u)}>
                        <strong>{u.displayName}</strong>
                        <ResultEmail>{u.email}</ResultEmail>
                      </ResultItem>
                    ))
                  )}
                </Results>
              )}
            </UserSearchWrap>
          )}
          {userError && <FieldError>{userError}</FieldError>}
        </Field>

        <Field>
          <FieldLabel>Patalpa *</FieldLabel>
          <FieldSelect
            name="roomId"
            value={formik.values.roomId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
          >
            <option value="">— pasirink —</option>
            {sortedRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.floor} a. · {r.number}
                {r.name ? ` · ${r.name}` : ''} ({r.deskCount} v.)
              </option>
            ))}
          </FieldSelect>
          {formik.touched.roomId && formik.errors.roomId && (
            <FieldError>{formik.errors.roomId}</FieldError>
          )}
        </Field>

        <Row>
          <Field>
            <FieldLabel>
              {isRecurring ? 'Darbo vieta (nebūtina — auto)' : 'Darbo vieta *'}
              {selectedRoom ? ` (1–${selectedRoom.deskCount})` : ''}
            </FieldLabel>
            <FieldInput
              type="number"
              name="deskNumber"
              min={1}
              max={selectedRoom?.deskCount}
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

const FieldError = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.danger};
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

const UserSearchWrap = styled.div`
  position: relative;
`;

const Results = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 10;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  max-height: 220px;
  overflow-y: auto;
`;

const ResultItem = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${({ theme }) => theme.colors.bg};
  }
`;

const ResultEmail = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const ResultEmpty = styled.div`
  padding: 8px 10px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textMute};
`;

const Chip = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid ${({ theme }) => theme.colors.brand};
  border-radius: ${({ theme }) => theme.ui.radiusSm};
  font-size: 14px;
  background: ${({ theme }) => theme.colors.bg};
`;

const ChipSub = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 12px;
`;

const ChipClear = styled.button`
  flex-shrink: 0;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.brand};
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
`;
