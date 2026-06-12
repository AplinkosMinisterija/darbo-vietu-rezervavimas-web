import { useFormik } from 'formik';
import * as Yup from 'yup';
import styled from 'styled-components';
import Modal, { PrimaryButton, SecondaryButton } from '../Modal';
import { adminApi } from '../../api/admin';
import { adminErrorCode, adminErrorMessage } from '../../lib/adminErrorMessages';
import { useToast } from '../Toast';
import type { Room } from '../../types';

interface Props {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onSuccess: () => void;
}

const schema = Yup.object({
  number: Yup.string()
    .trim()
    .required('Privaloma įvesti patalpos numerį')
    .max(32, 'Numeris per ilgas'),
  name: Yup.string().trim().required('Privaloma įvesti pavadinimą').max(200, 'Pavadinimas per ilgas'),
  floor: Yup.number()
    .typeError('Aukštas turi būti skaičius')
    .integer('Aukštas turi būti sveikas skaičius')
    .min(1, 'Aukštas turi būti 1-10')
    .max(10, 'Aukštas turi būti 1-10')
    .required('Privaloma įvesti aukštą'),
  deskCount: Yup.number()
    .typeError('Darbo vietų skaičius turi būti skaičius')
    .integer('Darbo vietų skaičius turi būti sveikas skaičius')
    .min(0, 'Darbo vietų skaičius negali būti neigiamas')
    .required('Privaloma įvesti darbo vietų skaičių'),
  isShared: Yup.boolean(),
});

/**
 * Esamos patalpos redagavimas — VISI laukai (numeris, pavadinimas, aukštas,
 * darbo vietų sk., bendra). `enableReinitialize` perkrauna formą, kai pakeičiam
 * `room` (atidarom kitą eilutę). 409 NUMBER_TAKEN → `number` field error;
 * 409 DESK_HAS_FUTURE_RESERVATIONS (mažinant deskCount) → toast — BE turi
 * authoritative future-reservation patikrą.
 */
export default function EditRoomModal({ open, room, onClose, onSuccess }: Props) {
  const toast = useToast();

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      number: room?.number ?? '',
      name: room?.name ?? '',
      floor: room?.floor ?? 1,
      deskCount: room?.deskCount ?? 0,
      isShared: room?.isShared ?? false,
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!room) return;
      try {
        await adminApi.rooms.update(room.id, {
          number: values.number.trim(),
          name: values.name.trim(),
          floor: Number(values.floor),
          deskCount: Number(values.deskCount),
          isShared: values.isShared,
        });
        toast.success('Patalpa atnaujinta');
        onSuccess();
        onClose();
      } catch (err) {
        const code = adminErrorCode(err);
        if (code === 'NUMBER_TAKEN') {
          helpers.setFieldError('number', 'Tokia patalpa jau registruota');
        } else {
          toast.error(adminErrorMessage(err));
        }
      }
    },
  });

  function handleClose() {
    if (formik.isSubmitting) return;
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={room ? `Redaguoti patalpą ${room.number}` : 'Redaguoti patalpą'}
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
            {formik.isSubmitting ? 'Saugoma…' : 'Išsaugoti'}
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
          <FieldLabel>Numeris *</FieldLabel>
          <FieldInput
            name="number"
            value={formik.values.number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
            placeholder="pvz. 309"
          />
          {formik.touched.number && formik.errors.number && (
            <FieldError>{formik.errors.number}</FieldError>
          )}
        </Field>

        <Field>
          <FieldLabel>Pavadinimas *</FieldLabel>
          <FieldInput
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={formik.isSubmitting}
            placeholder="pvz. Posėdžių salė"
          />
          {formik.touched.name && formik.errors.name && (
            <FieldError>{formik.errors.name}</FieldError>
          )}
        </Field>

        <Row>
          <Field>
            <FieldLabel>Aukštas (1-10) *</FieldLabel>
            <FieldInput
              type="number"
              name="floor"
              min={1}
              max={10}
              value={formik.values.floor}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
            />
            {formik.touched.floor && formik.errors.floor && (
              <FieldError>{formik.errors.floor}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel>Darbo vietų skaičius *</FieldLabel>
            <FieldInput
              type="number"
              name="deskCount"
              min={0}
              value={formik.values.deskCount}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={formik.isSubmitting}
            />
            {formik.touched.deskCount && formik.errors.deskCount && (
              <FieldError>{formik.errors.deskCount}</FieldError>
            )}
          </Field>
        </Row>

        <CheckRow>
          <input
            id="editIsShared"
            type="checkbox"
            name="isShared"
            checked={formik.values.isShared}
            onChange={formik.handleChange}
            disabled={formik.isSubmitting}
          />
          <label htmlFor="editIsShared">Bendra patalpa (matoma visiems)</label>
        </CheckRow>
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

const CheckRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;
