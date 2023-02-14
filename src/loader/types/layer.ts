export type TileUrlParameters<UrlParameters> = {x: number; y: number; zoom: number} & UrlParameters;

export interface LayerProps<UrlParameters = unknown> {
  id: string;
  getUrl: (p: TileUrlParameters<UrlParameters>) => string;
  urlParameters: UrlParameters; // things that are relevant for fetching like "timestep"
  zIndex: number;
  maxZoom: number;
  debug?: boolean;
  debugMode?: string;
}

export const enum LayerDebugMode {
  OVERLAY = 'overlay',
  REPLACE = 'replace'
}
