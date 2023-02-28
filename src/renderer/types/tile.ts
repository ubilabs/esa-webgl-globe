import type {Scene, Texture} from 'three';
import type {TileId} from '../../tile-id';

export type TileType = 'tile' | 'image';

export interface TileProps {
  tileId: TileId;
  zIndex: number;
  url: string;
  texture: Texture;
  scene: Scene;
  type: TileType;
}

export const enum TileLoadingState {
  QUEUED,
  LOADING,
  LOADED,
  ERROR
}

export interface RenderTile {
  tileId: TileId;
  zIndex: number;
  url: string;
  urlParameters: Record<string, string | number>;
  loadingState: TileLoadingState;
  type: TileType;
  data?: ImageBitmap;
  debug?: boolean;
  /**
   * The distance in zoom-levels to the tile's placeholder, used to compute the loading-priority.
   * Computed as `tile.tileId.zoom - placeholder.tileId.zoom`, so -1 means we have the children
   * available to replace this tile and 3 means that the best available replacement is 3 zoomlevels
   * away.
   */
  placeholderDistance?: number;
}
