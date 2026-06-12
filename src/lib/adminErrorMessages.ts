import type { AxiosError } from 'axios';

/**
 * LT'iškos žinutės admin'o veiksmams. Atskirta nuo `errorMessages.ts`
 * (citizen reservations), nes admin'as turi savo distinct error code'us
 * (NUMBER_TAKEN, DESK_HAS_FUTURE_RESERVATIONS, ROOM_HAS_FUTURE_RESERVATIONS,
 * FORBIDDEN).
 */
export type AdminErrorCode =
  | 'NUMBER_TAKEN'
  | 'DESK_HAS_FUTURE_RESERVATIONS'
  | 'ROOM_HAS_FUTURE_RESERVATIONS'
  | 'FORBIDDEN'
  | 'CANNOT_DEMOTE_SELF'
  | 'INVALID_ROOM_ID'
  | 'EMAIL_TAKEN'
  | 'NAME_REQUIRED'
  | 'SELF_DELETE_FORBIDDEN'
  | 'USER_NOT_FOUND';

const MESSAGES: Record<AdminErrorCode, string> = {
  NUMBER_TAKEN: 'Tokia patalpa jau registruota',
  DESK_HAS_FUTURE_RESERVATIONS:
    'Darbo vietos turi būsimas rezervacijas, atšaukite prieš mažinant deskCount',
  ROOM_HAS_FUTURE_RESERVATIONS:
    'Yra būsimų rezervacijų, atšaukite prieš trindami patalpą',
  FORBIDDEN: 'Šį veiksmą gali atlikti tik administratorius',
  CANNOT_DEMOTE_SELF: 'Negali pažeminti save',
  INVALID_ROOM_ID: 'Neteisingas patalpos ID',
  EMAIL_TAKEN: 'Toks el. paštas jau naudojamas',
  NAME_REQUIRED: 'Vardas negali būti tuščias',
  SELF_DELETE_FORBIDDEN: 'Negalima ištrinti savo paskyros',
  USER_NOT_FOUND: 'Naudotojas nerastas',
};

const GENERIC = 'Nepavyko atlikti veiksmo — pabandyk dar kartą';

export function adminErrorCode(err: unknown): AdminErrorCode | null {
  const ax = err as AxiosError<{ error?: string }> | undefined;
  const code = ax?.response?.data?.error as AdminErrorCode | undefined;
  if (code && code in MESSAGES) return code;
  return null;
}

export function adminErrorMessage(err: unknown): string {
  const code = adminErrorCode(err);
  if (code) return MESSAGES[code];
  return GENERIC;
}
