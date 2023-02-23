import type {Scene, Texture} from 'three';
import type {TileId} from '../../tile-id';

type TileType = 'tile' | 'image';

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
  loadingState: TileLoadingState;
  data?: ImageBitmap;
  type?: TileType;
}
