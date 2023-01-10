import {TileIdCache} from './tile-id-cache';

export type TileIdArray = [x: number, y: number, zoom: number];

/**
 * The TileId primitive encapsulates basic tile-math operations (retrieve
 * parents, children). It is built in a way that guarantees that there can
 * only ever be a single instance of any given tile, which allows the
 * tile-objects to be used like primitives in comparisons, maps, sets and
 * so on.
 *
 * A TileId instance can be retrieved using the static methods `TileId.fromId()`
 * and `TileId.fromXYZ()`. The tileIds are of the format `z/x/y`.
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
    if (this.zoom === 0) {
      return null;
    }

    const zoom = this.zoom - 1;
    const x = this.x >> 1;
    const y = this.y >> 1;

    return TileId.fromXYZ(x, y, zoom);
  }

  get children(): TileId[] {
    const zoom = this.zoom + 1;

    const x0 = this.x << 1;
    const y0 = this.y << 1;

    const children = [];
    for (let x = x0; x < x0 + 2; x++) {
      for (let y = y0; y < y0 + 2; y++) {
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

  static fromId(id: string): TileId {
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
