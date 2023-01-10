import {TileCache} from './tile-cache';

export type TileId = string;
export type TileIdArray = [x: number, y: number, zoom: number];

/**
 * The Tile primitive encapsulates basic tile-math operations (retrieve
 * parents, children). It is built in a way that guarantees that there can
 * only ever be a single instance of any given tile, which allows the
 * tile-objects to be used like primitives in comparisons, maps, sets and
 * so on.
 *
 * A Tile instance can be retrieved using the static methods `Tile.fromId()`
 * and `Tile.fromXYZ()`. The tileIds are of the format `z/x/y`.
 */
export class Tile {
  readonly id: TileId;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;

  private constructor(x: number, y: number, zoom: number) {
    this.id = Tile.getId(x, y, zoom);
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  get parent(): Tile | null {
    if (this.zoom === 0) {
      return null;
    }

    const zoom = this.zoom - 1;
    const x = this.x >> 1;
    const y = this.y >> 1;

    return Tile.fromXYZ(x, y, zoom);
  }

  get children(): Tile[] {
    const zoom = this.zoom + 1;

    const x0 = this.x << 1;
    const y0 = this.y << 1;

    const children = [];
    for (let x = x0; x < x0 + 2; x++) {
      for (let y = y0; y < y0 + 2; y++) {
        children.push(Tile.fromXYZ(x, y, zoom));
      }
    }

    return children;
  }

  private static tileCache = new TileCache();

  static fromXYZ(x: number, y: number, zoom: number): Tile {
    const id = Tile.getId(x, y, zoom);
    if (!Tile.tileCache.has(id)) {
      Tile.tileCache.add(Object.freeze(new Tile(x, y, zoom)));
    }

    return Tile.tileCache.get(id) as Tile;
  }

  static fromId(id: TileId): Tile {
    if (!Tile.tileCache.has(id)) {
      Tile.tileCache.add(Object.freeze(new Tile(...Tile.parseId(id))));
    }

    return Tile.tileCache.get(id) as Tile;
  }

  static parseId(id: TileId): TileIdArray {
    const [zoom, x, y] = id.split('/').map(Number);
    return [x, y, zoom];
  }

  static getId(x: number, y: number, zoom: number): TileId {
    return `${zoom}/${x}/${y}`;
  }
}
