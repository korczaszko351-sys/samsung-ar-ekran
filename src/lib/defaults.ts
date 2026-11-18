import type { ProjectionContent, ProjectionSettings } from './types';

export const DEFAULT_PROJECTION: ProjectionSettings = {
  size: 1,
  opacity: 1,
  grid: true,
  mirror: false,
  tracking: true,
  invertRotation: false,
  smoothing: 0.3,
  fov: 50,
  diagnostics: false,
};

/** Shown by the projector before the user adds their own screen content. */
export const DEMO_CONTENT: ProjectionContent = {
  title: 'Ekran demonstracyjny',
  kind: 'text',
  text:
    'Projekcja bez ARCore\n\nObraz leży perspektywicznie na powierzchni, którą zaznaczysz czterema narożnikami. Gdy obrócisz telefon, obraz zostaje na miejscu.',
  color: '#0B1226',
  imageUri: null,
  mirror: false,
};

/** Background colors offered in the editor. */
export const BACKGROUND_COLORS = [
  '#0B1226',
  '#111827',
  '#1F2937',
  '#FFFFFF',
  '#F5E6C8',
  '#0EA5B7',
  '#3B6FE0',
  '#B91C1C',
];
