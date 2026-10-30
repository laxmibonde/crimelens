/**
 * CrimeLens - Chicago Nightfall Intelligence Design System Tokens
 * 
 * Palette:
 * - Midnight Navy (#0B1423): Deep urban night, primary viewport foundation.
 * - River Blue (#17365D): Chicago River deep navy, structural surface elevation.
 * - Lake Blue (#35B8E8): Lake Michigan vibrant turquoise-blue, focal actions & high-density data.
 * - Amber (#E9B44C): Architectural warm light, secondary highlights, warnings & synthetic badges.
 * - Alert Red (#E76F74): Restrained civic emergency red, critical anomalies & declines.
 * - Off-White (#EAF2FF): Crisp high-contrast typographic hierarchy.
 */

export const CHICAGO_NIGHTFALL = {
  // Core Brand Colors
  midnightNavy: '#0B1423',
  navyDark: '#070C15',
  riverBlue: '#17365D',
  riverBlueLight: '#224D82',
  lakeBlue: '#35B8E8',
  lakeBlueMuted: 'rgba(53, 184, 232, 0.15)',
  lakeBlueGlow: 'rgba(53, 184, 232, 0.3)',
  amber: '#E9B44C',
  amberMuted: 'rgba(233, 180, 76, 0.15)',
  alertRed: '#E76F74',
  alertRedMuted: 'rgba(231, 111, 116, 0.15)',
  offWhite: '#EAF2FF',

  // Surfaces & Backgrounds
  bgMidnight: '#0B1423',
  bgCard: '#101B2E',
  bgCardElevated: '#15243E',
  bgSidebar: '#09101C',
  bgGlass: 'rgba(16, 27, 46, 0.85)',

  // Typography
  textPrimary: '#EAF2FF',
  textMuted: '#94A7C6',
  textDim: '#5E7292',

  // Borders
  borderSubtle: 'rgba(53, 184, 232, 0.12)',
  borderRiver: '#1E3758',
  borderLake: '#35B8E8',
  borderAmber: '#E9B44C',

  // Chart Palettes (Consistent across all visual analytics)
  chartPalette: [
    '#35B8E8', // Lake Blue (Primary)
    '#E9B44C', // Chicago Amber (Secondary)
    '#7086FD', // River Indigo
    '#2DD4BF', // Lake Mint
    '#E76F74', // Alert Coral
    '#A78BFA', // Twilight Violet
    '#38BDF8', // Sky Accent
    '#F472B6'  // Rose Accent
  ],

  // Binary Distribution Pies
  pieArrest: ['#17365D', '#35B8E8'], // Non-Arrest (River), Arrest (Lake Blue)
  pieDomestic: ['#17365D', '#E9B44C'], // Non-Domestic (River), Domestic (Amber)

  // Status Badges
  statusReal: {
    bg: 'rgba(53, 184, 232, 0.12)',
    border: 'rgba(53, 184, 232, 0.35)',
    color: '#35B8E8'
  },
  statusSynthetic: {
    bg: 'rgba(233, 180, 76, 0.12)',
    border: 'rgba(233, 180, 76, 0.4)',
    color: '#E9B44C'
  },

  // Backward-compatibility alias so CHICAGO_NIGHTFALL.colors.* resolves safely
  get colors() {
    return this;
  }
};

export default CHICAGO_NIGHTFALL;
