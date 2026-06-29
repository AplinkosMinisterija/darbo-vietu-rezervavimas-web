import { describe, expect, it } from 'vitest';
import { reservationErrorMessage } from './errorMessages';
import { makeAxiosError } from '../test/utils';

describe('reservationErrorMessage', () => {
  it('maps each known reservation error code to its LT message', () => {
    const cases: Record<string, string> = {
      DESK_TAKEN: 'Ši darbo vieta tą dieną jau rezervuota — perskaityk iš naujo',
      USER_HAS_RESERVATION: 'Jau turi rezervaciją tai dienai',
      DATE_IN_PAST: 'Negalima rezervuoti praėjusiai datai',
      INVALID_DESK_NUMBER: 'Darbo vietos numeris neteisingas',
      NO_ROOM_ACCESS: 'Tu negali rezervuoti šioje patalpoje',
      CANNOT_CANCEL_PAST: 'Negalima atšaukti praėjusios rezervacijos',
    };
    for (const [code, message] of Object.entries(cases)) {
      expect(reservationErrorMessage(makeAxiosError({ error: code }))).toBe(message);
    }
  });

  it('falls back to the generic message for unknown codes', () => {
    expect(reservationErrorMessage(makeAxiosError({ error: 'WAT' }))).toBe(
      'Nepavyko atlikti veiksmo — pabandyk dar kartą',
    );
  });

  it('falls back to the generic message when there is no response body', () => {
    expect(reservationErrorMessage(new Error('network'))).toBe(
      'Nepavyko atlikti veiksmo — pabandyk dar kartą',
    );
    expect(reservationErrorMessage(undefined)).toBe(
      'Nepavyko atlikti veiksmo — pabandyk dar kartą',
    );
  });
});
