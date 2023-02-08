import type {TileId} from '../../tile-id';

export interface TileProps {
  tileId: TileId;
  zIndex: number;
  url: string;
  texture: THREE.Texture;
  scene: THREE.Scene;
}

export interface RenderTile {
  tileId: TileId;
  zIndex: number;
  url: string;
  data?: ImageBitmap;
}
