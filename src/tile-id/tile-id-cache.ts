import type {TileId} from './tile-id';

/**
 * The TileCache is basically a WeakSet of tiles that can be
 * queried via the tileId.
 * It is used to guarantee that there can always only exists
 * a single instance of a specific tile within the process and
 * thus that `tileA === tileB` will always work as expected.
 */
export class TileIdCache {
  private registry: FinalizationRegistry<string>;
  private tileIdCache: Map<string, WeakRef<TileId>>;

  constructor() {
    this.tileIdCache = new Map();
    this.registry = new FinalizationRegistry<string>(id =>
      this.tileIdCache.delete(id)
    );
  }

  has(id: string): boolean {
    const ref = this.tileIdCache.get(id);

    if (!ref) return false;

    return ref.deref() !== undefined;
  }

  get(id: string): TileId | undefined {
    const ref = this.tileIdCache.get(id);

    if (!ref) return undefined;

    return ref.deref();
  }

  add(tile: TileId) {
    this.tileIdCache.set(tile.id, new WeakRef(tile));
    this.registry.register(tile, tile.id);
  }

  cleanup() {
    for (let [key, ref] of this.tileIdCache.entries()) {
      if (ref.deref() === undefined) {
        this.tileIdCache.delete(key);
      }
    }
  }
}
