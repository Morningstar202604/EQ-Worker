export const palette = {
  paper: '#f6f1e4',
  paperDeep: '#efe7d4',
  teal: '#5f8575',
  tealLight: '#7da08f',
  gold: '#c9a86a',
  ink: '#4a4238',
  inkStrong: '#3d3730',
  inkSoft: '#7d7263',
  line: '#b9a480',
  red: '#c97b7b',
  green: '#7fae83',
  blue: '#8aa6c9',
} as const;

export type PaletteColor = keyof typeof palette;
