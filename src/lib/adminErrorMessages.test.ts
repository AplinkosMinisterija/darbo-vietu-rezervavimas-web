import { describe, expect, it } from 'vitest';
import { adminErrorCode, adminErrorMessage } from './adminErrorMessages';
import { makeAxiosError } from '../test/utils';

const ALL_CODES: Record<string, string> = {
  NUMBER_TAKEN: 'Tokia patalpa jau registruota',
  DESK_HAS_FUTURE_RESERVATIONS:
    'Darbo vietos turi būsimas rezervacijas, atšaukite prieš mažinant deskCount',
  ROOM_HAS_FUTURE_RESERVATIONS: 'Yra būsimų rezervacijų, atšaukite prieš trindami patalpą',
  FORBIDDEN: 'Šį veiksmą gali atlikti tik administratorius',
  CANNOT_DEMOTE_SELF: 'Negali pažeminti save',
  INVALID_ROOM_ID: 'Neteisingas patalpos ID',
  EMAIL_TAKEN: 'Toks el. paštas jau naudojamas',
  NAME_REQUIRED: 'Vardas negali būti tuščias',
  SELF_DELETE_FORBIDDEN: 'Negalima ištrinti savo paskyros',
  USER_NOT_FOUND: 'Naudotojas nerastas',
  USER_HAS_RESERVATION: 'Šis naudotojas jau turi rezervaciją tai dienai',
  DESK_TAKEN: 'Ši darbo vieta tą dieną jau rezervuota',
  INVALID_DESK_NUMBER: 'Tokios darbo vietos patalpoje nėra',
  DATE_IN_PAST: 'Negalima rezervuoti praėjusiai datai',
  ROOM_NOT_FOUND: 'Patalpa nerasta',
};

describe('adminErrorCode', () => {
  it('returns the recognised code', () => {
    expect(adminErrorCode(makeAxiosError({ error: 'NUMBER_TAKEN' }))).toBe('NUMBER_TAKEN');
  });

  it('returns null for unknown codes or missing body', () => {
    expect(adminErrorCode(makeAxiosError({ error: 'NOPE' }))).toBeNull();
    expect(adminErrorCode(new Error('x'))).toBeNull();
    expect(adminErrorCode(undefined)).toBeNull();
  });
});

describe('adminErrorMessage', () => {
  it('maps every known admin error code to its LT message', () => {
    for (const [code, message] of Object.entries(ALL_CODES)) {
      expect(adminErrorMessage(makeAxiosError({ error: code }))).toBe(message);
    }
  });

  it('falls back to the generic message otherwise', () => {
    expect(adminErrorMessage(makeAxiosError({ error: 'UNKNOWN' }))).toBe(
      'Nepavyko atlikti veiksmo — pabandyk dar kartą',
    );
    expect(adminErrorMessage(undefined)).toBe('Nepavyko atlikti veiksmo — pabandyk dar kartą');
  });
});
