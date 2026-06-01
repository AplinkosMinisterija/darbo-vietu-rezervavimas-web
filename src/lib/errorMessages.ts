import type { AxiosError } from 'axios';
import type { ReservationErrorCode } from '../types';

/**
 * LT'iškos žinutės iš `error` koodo. Default'as paliktas generic'ą — kad
 * neatskleistų BE detalių, bet vis tiek leistų vartotojui retry'inti.
 */
const MESSAGES: Record<ReservationErrorCode, string> = {
  DESK_TAKEN: 'Ši darbo vieta tą dieną jau rezervuota — perskaityk iš naujo',
  USER_HAS_RESERVATION: 'Jau turi rezervaciją tai dienai',
  DATE_IN_PAST: 'Negalima rezervuoti praėjusiai datai',
  INVALID_DESK_NUMBER: 'Darbo vietos numeris neteisingas',
  NO_ROOM_ACCESS: 'Tu negali rezervuoti šioje patalpoje',
  CANNOT_CANCEL_PAST: 'Negalima atšaukti praėjusios rezervacijos',
};

const GENERIC = 'Nepavyko atlikti veiksmo — pabandyk dar kartą';

export function reservationErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{ error?: string; message?: string }> | undefined;
  const code = ax?.response?.data?.error as ReservationErrorCode | undefined;
  if (code && code in MESSAGES) return MESSAGES[code];
  return GENERIC;
}
