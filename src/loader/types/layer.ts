export type TileUrlParameters<TUrlParameters> = {
  x: number;
  y: number;
  zoom: number;
} & TUrlParameters;

export interface LayerProps<TUrlParameters = {}> {
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
