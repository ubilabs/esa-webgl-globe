import type {Scene, Texture} from 'three';
import type {TileId} from '../../tile-id';

export interface TileProps {
  tileId: TileId;
  zIndex: number;
  url: string;
  texture: Texture;
  scene: Scene;
}

export interface RenderTile {
  tileId: TileId;
  zIndex: number;
  url: string;
  data?: ImageBitmap;
}
