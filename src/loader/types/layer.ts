export type TileUrlParameters<TUrlParameters extends Record<string, string | number> = {}> = {
  x: number;
  y: number;
  zoom: number;
} & TUrlParameters;

export interface LayerProps<TUrlParameters extends Record<string, string | number> = {}> {
  id: string;
  getUrl: (p: TileUrlParameters<TUrlParameters>) => string;
  urlParameters: TUrlParameters; // things that are relevant for fetching like "timestep"
  zIndex: number;
  maxZoom: number;
  minZoom?: number;
  debug?: boolean;
  debugMode?: string;
}

export const enum LayerDebugMode {
  OVERLAY = 'overlay',
  REPLACE = 'replace'
}
