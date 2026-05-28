import { useState } from 'react';
import styled from 'styled-components';
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
  deskNumber: number | null;
  date: string;
  onSuccess: () => void;
}

/**
 * Reserve confirmation — viename submit'e POST /reservations. Loading state
 * blok'ina double-click'us. Error code'as map'inasi į LT žinutę per
 * `reservationErrorMessage()`.
 */
export default function ReserveModal({
  open,
  onClose,
  room,
  deskNumber,
  date,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  async function handleConfirm() {
    if (!room || deskNumber == null) return;
    setSubmitting(true);
    try {
      await reservationsApi.create({ roomId: room.id, deskNumber, date });
      toast.success('Rezervacija sukurta');
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
      title="Rezervuoti darbo vietą"
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose} disabled={submitting}>
            Uždaryti
          </SecondaryButton>
          <PrimaryButton type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Rezervuojama…' : 'Rezervuoti'}
          </PrimaryButton>
        </>
      }
    >
      {room && deskNumber != null ? (
        <Lines>
          <Line>
            <Label>Kabinetas</Label>
            <Value>
              {room.number}
              {room.name && <Muted> · {room.name}</Muted>}
            </Value>
          </Line>
          <Line>
            <Label>Vieta</Label>
            <Value>{deskNumber}</Value>
          </Line>
          <Line>
            <Label>Data</Label>
            <Value>{humanDate(date)}</Value>
          </Line>
        </Lines>
      ) : (
        <p>Nepakanka duomenų rezervacijai.</p>
      )}
    </Modal>
  );
}

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

const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMute};
  font-weight: 400;
`;
