import {TileType} from '../../renderer/types/tile';

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
  type: TileType;
  maxZoom: number;
  minZoom: number;
  debug?: boolean;
  debugMode?: string;
}

export const enum LayerDebugMode {
  OVERLAY = 'overlay',
  REPLACE = 'replace'
}

export const enum LayerLoadingState {
  /** The layer is currently loading and cannot render a full set of tiles. */
  LOADING = 'loading',
  /** The layer is ready to render a full set of tiles, but not yet the requested set. */
  READY = 'ready',
  /** The layer completed loading of all requested tiles */
  IDLE = 'idle'
}
