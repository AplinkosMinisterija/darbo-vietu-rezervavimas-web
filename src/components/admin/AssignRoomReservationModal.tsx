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

const schema = Yup.object({
  deskNumber: Yup.number()
    .typeError('Įvesk darbo vietos numerį')
    .integer('Sveikas skaičius')
    .min(1, 'Darbo vieta ≥ 1')
    .required('Įvesk darbo vietą'),
  date: Yup.string().required('Pasirink datą'),
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
    initialValues: { deskNumber: 1, date: todayYmd() },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!room) return;
      if (!selectedUser) {
        setUserError('Pasirink vartotoją');
        return;
      }
      try {
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
              Darbo vieta *{room ? ` (1–${room.deskCount})` : ''}
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
            />
            {formik.touched.deskNumber && formik.errors.deskNumber && (
              <FieldError>{formik.errors.deskNumber}</FieldError>
            )}
          </Field>

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
        </Row>
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

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.ui.spacing.md};
`;
