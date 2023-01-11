import {ITileSelectorImpl, TileSelectorImpl} from './tile-selector-impl';
import {TileSelectorWorkerProxy} from './tile-selector-worker-proxy';
import {PerspectiveCamera, Vector2} from 'three';
import {TileId} from '../tile-id';

export type TileSelectorOptions = {
  debug: boolean;
  useOffscreenCanvas: boolean;
  useWorker: boolean;
};

const DEFAULT_OPTIONS: TileSelectorOptions = {
  debug: false,
  useOffscreenCanvas: true,
  useWorker: true
};

export class TileSelector {
  private options: TileSelectorOptions;
  private impl?: ITileSelectorImpl;

  private camera?: PerspectiveCamera;
  private size = new Vector2();

  private initialized: boolean = false;

  constructor(options: Partial<TileSelectorOptions> = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options};
  }

  private async initialize() {
    if (this.options.useWorker) {
      this.impl = new TileSelectorWorkerProxy();
    } else {
      this.impl = new TileSelectorImpl();
    }

    await this.impl.setOptions(this.options);
    this.initialized = true;
  }

  setSize(size: Vector2): void {
    this.size.copy(size);
  }

  setCamera(camera: PerspectiveCamera): void {
    this.camera = camera;
  }

  async getVisibleTiles(): Promise<Set<TileId>> {
    if (!this.camera)
      throw new Error('getVisibleTiles called without a camera');

    if (!this.initialized) await this.initialize();

    const tileIds = await this.impl!.computeVisibleTiles(
      this.size.toArray(),
      this.camera.projectionMatrix.toArray(),
      this.camera.matrix.toArray()
    );

    return new Set(tileIds.map(id => TileId.fromString(id)));
  }
}
