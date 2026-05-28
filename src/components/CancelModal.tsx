import { useState } from 'react';
import styled from 'styled-components';
import Modal, { DangerButton, SecondaryButton } from './Modal';
import { reservationsApi } from '../api/reservations';
import { reservationErrorMessage } from '../lib/errorMessages';
import { humanDate } from '../lib/dates';
import { useToast } from './Toast';

interface CancellableReservation {
  id: string;
  date: string;
  deskNumber: number;
  roomLabel: string; // e.g. "309 · Bendras"
}

interface Props {
  open: boolean;
  onClose: () => void;
  reservation: CancellableReservation | null;
  onSuccess: () => void;
}

/**
 * Cancel confirmation — viename DELETE call'e. Backend tikrina, ar
 * rezervacija ne praėjusi (CANNOT_CANCEL_PAST). Sėkmės atveju → toast +
 * onSuccess() (parent invalidate'ina list'ą).
 */
export default function CancelModal({ open, onClose, reservation, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleConfirm() {
    if (!reservation) return;
    setSubmitting(true);
    try {
      await reservationsApi.cancel(reservation.id);
      toast.success('Rezervacija atšaukta');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(reservationErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Atšaukti rezervaciją?"
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={submitting}>
            Uždaryti
          </SecondaryButton>
          <DangerButton type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Atšaukiama…' : 'Atšaukti'}
          </DangerButton>
        </>
      }
    >
      {reservation ? (
        <Body>
          <p>Ar tikrai nori atšaukti rezervaciją?</p>
          <Lines>
            <Line>
              <Label>Patalpa</Label>
              <Value>{reservation.roomLabel}</Value>
            </Line>
            <Line>
              <Label>Vieta</Label>
              <Value>{reservation.deskNumber}</Value>
            </Line>
            <Line>
              <Label>Data</Label>
              <Value>{humanDate(reservation.date)}</Value>
            </Line>
          </Lines>
        </Body>
      ) : (
        <p>Nepakanka duomenų atšaukimui.</p>
      )}
    </Modal>
  );
}

const Body = styled.div`
  p {
    margin: 0 0 ${({ theme }) => theme.ui.spacing.md} 0;
  }
`;

const Lines = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.ui.spacing.sm};
`;

const Line = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.ui.spacing.md};
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child { border-bottom: none; }
`;

const Label = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-size: 13px;
`;

const Value = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;
