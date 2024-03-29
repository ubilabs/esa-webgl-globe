import {ITileSelectorImpl, TileSelectorImpl} from './tile-selector-impl';
import {TileSelectorWorkerProxy} from './tile-selector-worker-proxy';
import {PerspectiveCamera, OrthographicCamera, Vector2} from 'three';
import {TileId} from '../tile-id';
import {RenderMode} from '../renderer/types/renderer';

export type TileSelectorOptions = {
  debug: boolean;
  useOffscreenCanvas: boolean;
  useWorker: boolean;
  workerUrl: string;
};

const DEFAULT_OPTIONS: TileSelectorOptions = {
  debug: false,
  useOffscreenCanvas: true,
  useWorker: true,
  workerUrl: ''
};

const support = {
  worker: 'Worker' in window,
  offscreenCanvas: 'OffscreenCanvas' in window
};

/**
 * The TileSelector is the public interface to the tile selection process. Based on the configration
 * it will start the actual implementation (`TileSelectorImpl`) in a worker or in the same process.
 */
export class TileSelector {
  private readonly options: TileSelectorOptions;
  private impl?: ITileSelectorImpl;

  private camera?: PerspectiveCamera | OrthographicCamera;
  private size = new Vector2();

  private initialized?: Promise<void>;
  private renderMode: RenderMode = RenderMode.GLOBE;

  /**
   * Create the tile-selector frontend with the specified options.
   *
   * @param options
   */
  constructor(options: Partial<TileSelectorOptions> = {}) {
    this.options = {...DEFAULT_OPTIONS, ...options};

    // when offscreencanvas or workers aren't supported, we can't use the worker-mode.
    if (!support.offscreenCanvas || !support.worker || options.debug) {
      this.options.useWorker = false;
      this.options.useOffscreenCanvas = false;
    }
  }

  /**
   * Sets the size for the renderer
   *
   * @param size
   */
  setSize(size: Vector2): void {
    this.size.copy(size);
  }

  /**
   * Attach a camera to the tile-selector.
   *
   * @param camera
   */
  setCamera(camera: PerspectiveCamera | OrthographicCamera): void {
    this.camera = camera;
  }

  /** Retrieve the tiles currently visible for the specified camera. */
  async getVisibleTiles(): Promise<Set<TileId>> {
    if (!this.camera) throw new Error('getVisibleTiles called without a camera');
    if (this.size.lengthSq() === 0)
      throw new Error('getVisibleTiles called without setting a size');

    if (!this.initialized) {
      this.initialized = this.initialize();
    }

    await this.initialized;

    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();

    const tileIds = await this.impl!.computeVisibleTiles(
      this.size.toArray(),
      this.camera.projectionMatrix.toArray(),
      this.camera.matrix.toArray(),
      this.renderMode
    );

    return new Set(tileIds.map(id => TileId.fromString(id)));
  }

  /** One-time initialization that is started when retrieving tiles for the first time. */
  private async initialize() {
    if (this.options.useWorker) {
      this.impl = new TileSelectorWorkerProxy(this.options.workerUrl);
    } else {
      this.impl = new TileSelectorImpl();
    }

    await this.impl.setOptions(this.options);
  }

  setRenderMode(renderMode: RenderMode) {
    this.renderMode = renderMode;
  }

  async destroy() {
    this.impl?.destroy();
  }
}
