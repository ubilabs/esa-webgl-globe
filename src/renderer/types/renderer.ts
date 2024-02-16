export const enum RenderMode {
  GLOBE = 'globe',
  MAP = 'map'
}

export type RenderOptions = Partial<{
  atmosphereEnabled: boolean;
  atmosphereColor: number[];
  atmosphereStrength: number;
  shadingEnabled: boolean;
}>;
