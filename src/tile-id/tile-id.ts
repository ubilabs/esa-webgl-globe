import {TileIdCache} from './tile-id-cache';
import {assertNotNull} from '../util/assert';

export type TileIdArray = [x: number, y: number, zoom: number];

/**
 * The TileId primitive encapsulates basic tile-math operations (retrieve parents, children). It is
 * built in a way that guarantees that there can only ever be a single instance of any given tile,
 * which allows the tile-objects to be used like primitives in comparisons, maps, sets and so on.
 *
 * A TileId instance can be retrieved using the static methods `TileId.fromString()` and
 * `TileId.fromXYZ()`. The tileIds are of the format `z/x/y`.
 */
export class TileId {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;

  private constructor(x: number, y: number, zoom: number) {
    this.id = TileId.createStringId(x, y, zoom);
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  get parent(): TileId | null {
    return this.getParentAtZoom(this.zoom - 1);
  }

  get children(): TileId[] {
    return this.getChildrenAtZoom(this.zoom + 1);
  }

  atZoom(zoom: number): TileId[] {
    if (zoom <= 0) {
      throw new Error('zoom has to be >= 0');
    }

    if (zoom === this.zoom) return [this];

    if (zoom < this.zoom) {
      const parentAtZoom = this.getParentAtZoom(zoom);
      assertNotNull(parentAtZoom);

      return [parentAtZoom];
    }

    return this.getChildrenAtZoom(zoom);
  }

  getParentAtZoom(zoom: number): TileId | null {
    if (zoom >= this.zoom) return null;
    if (this.zoom === 0) return null;

    const dz = this.zoom - zoom;
    const x = this.x >> dz;
    const y = this.y >> dz;

    return TileId.fromXYZ(x, y, zoom);
  }

  getChildrenAtZoom(zoom: number): TileId[] {
    if (zoom <= this.zoom) return [];
    if (zoom === 0) return [];

    const dz = zoom - this.zoom;
    const numTiles = 1 << dz;
    const x0 = this.x << dz;
    const y0 = this.y << dz;

    const children = [];
    for (let x = x0; x < x0 + numTiles; x++) {
      for (let y = y0; y < y0 + numTiles; y++) {
        children.push(TileId.fromXYZ(x, y, zoom));
      }
    }

    return children;
  }

  private static cache = new TileIdCache();

  static fromXYZ(x: number, y: number, zoom: number): TileId {
    const id = TileId.createStringId(x, y, zoom);
    if (!TileId.cache.has(id)) {
      TileId.cache.add(Object.freeze(new TileId(x, y, zoom)));
    }

    return TileId.cache.get(id) as TileId;
  }

  static fromString(id: string): TileId {
    if (!TileId.cache.has(id)) {
      TileId.cache.add(Object.freeze(new TileId(...TileId.parseStringId(id))));
    }

    return TileId.cache.get(id) as TileId;
  }

  static parseStringId(id: string): TileIdArray {
    const [zoom, x, y] = id.split('/').map(Number);
    return [x, y, zoom];
  }

  static createStringId(x: number, y: number, zoom: number): string {
    return `${zoom}/${x}/${y}`;
  }
}
