import type {Tile, TileId} from './tile';

/**
 * The TileCache is basically a WeakSet of tiles that can be
 * queried via the tileId.
 * It is used to guarantee that there can always only exists
 * a single instance of a specific tile within the process and
 * thus that `tileA === tileB` will always work as expected.
 */
export class TileCache {
  private registry: FinalizationRegistry<TileId>;
  private tileCache: Map<TileId, WeakRef<Tile>>;

  constructor() {
    this.tileCache = new Map();
    this.registry = new FinalizationRegistry<TileId>(id =>
      this.tileCache.delete(id)
    );
  }

  has(id: TileId): boolean {
    const ref = this.tileCache.get(id);

    if (!ref) return false;

    return ref.deref() !== undefined;
  }

  get(id: TileId): Tile | undefined {
    const ref = this.tileCache.get(id);

    if (!ref) return undefined;

    return ref.deref();
  }

  add(tile: Tile) {
    this.tileCache.set(tile.id, new WeakRef(tile));
    this.registry.register(tile, tile.id);
  }

  cleanup() {
    for (let [key, ref] of this.tileCache.entries()) {
      if (ref.deref() === undefined) {
        this.tileCache.delete(key);
      }
    }
  }
}
