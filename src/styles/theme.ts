/**
 * Theme — sek biip-alis-web pattern'ą (mint + navy), bet minimal scope:
 * tik tas spalvas, kurias spec'as `2026-05-28-stalu-rezervavimas-design.md`
 * #7 skyrius eksplicitiškai nurodo. Plėsti tik kai komponentas iš tikrųjų
 * naudoja naują token'ą.
 */
export const colors = {
  brand: '#5FBD86', // mint primary
  navy: '#29346F', // secondary
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  mute: '#6B7280',
  bg: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMute: '#6B7280',
};

export const ui = {
  radius: '8px',
  radiusSm: '4px',
  fontFamily: '"Poppins", system-ui, sans-serif',
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
};

export const theme = { colors, ui };
export type Theme = typeof theme;
