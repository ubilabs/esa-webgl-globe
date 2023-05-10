import {
  Camera,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three';
import {WebGLUtils} from 'three/src/renderers/webgl/WebGLUtils.js';

import {TileSelectionMaterial} from './tile-selector-material';
import {TileSelectionDebugMaterial} from './tile-selector-debug-material';
import {FullScreenQuad} from '../webgl/full-screen-quad';
import {readPixelsAsync} from '../webgl/read-pixels-async';

import type {TileSelectorOptions} from './tile-selector';

import {TileId} from '../tile-id';
import {RenderMode} from '../renderer/types/renderer';

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 270;

const GLOBE_LAYER = 1;
const MAP_LAYER = 2;

export interface ITileSelectorImpl {
  setOptions(options: TileSelectorOptions): Promise<void>;
  computeVisibleTiles(
    size: number[],
    projectionMatrix: number[],
    worldMatrix: number[],
    renderMode: RenderMode
  ): Promise<string[]>;
  destroy(): Promise<void>;
}

export class TileSelectorImpl implements ITileSelectorImpl {
  private options?: TileSelectorOptions;
  private canvas!: OffscreenCanvas | HTMLCanvasElement;
  private renderer!: WebGLRenderer;
  private renderTarget!: WebGLRenderTarget;
  private rendererUtils!: WebGLUtils;
  private rgbaArray?: Uint8Array;

  private readonly scene: Scene;
  // note the projection-matrix could be either a perspective or orthographic
  // camera, so we only use the common interface
  private readonly camera: Camera;
  private readonly tileSelectionMaterial: TileSelectionMaterial;
  private readonly sphere: Mesh<SphereGeometry, TileSelectionMaterial>;
  private readonly plane: Mesh<PlaneGeometry, TileSelectionMaterial>;

  // debugging stuff
  private isDebugMode: boolean = false;
  private fsQuad: FullScreenQuad<TileSelectionDebugMaterial>;

  constructor() {
    this.camera = new PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;

    this.tileSelectionMaterial = new TileSelectionMaterial();

    this.sphere = new Mesh(new SphereGeometry(1, 90, 45), this.tileSelectionMaterial);
    this.sphere.geometry.rotateY(Math.PI / -2);
    this.sphere.layers.set(GLOBE_LAYER);

    this.plane = new Mesh(new PlaneGeometry(4, 2), this.tileSelectionMaterial);
    this.plane.layers.set(MAP_LAYER);

    this.scene = new Scene();
    this.scene.add(this.sphere, this.plane);

    // used only for debug rendering
    this.fsQuad = new FullScreenQuad(new TileSelectionDebugMaterial());
  }

  async setOptions(options: TileSelectorOptions): Promise<void> {
    this.options = options;
    this.isDebugMode = options.debug;
  }

  async computeVisibleTiles(
    size: number[],
    projectionMatrix: number[],
    worldMatrix: number[],
    renderMode: RenderMode
  ): Promise<string[]> {
    if (!this.renderer) this.initRenderer();

    const [w, h] = size;

    if (w !== this.canvas.width || h !== this.canvas.height) {
      this.setSize(w, h);
    }

    this.render(projectionMatrix, worldMatrix, renderMode);

    const visibleTiles = await this.collectData();

    if (this.isDebugMode) {
      this.renderDebug();
    }

    return visibleTiles;
  }

  async destroy() {
    this.renderer.dispose();
    this.renderTarget.dispose();

    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.remove();
    }
  }

  private setSize(width: number, height: number) {
    this.canvas!.width = width;
    this.canvas!.height = height;
    this.renderer.setViewport(0, 0, width, height);
    this.rgbaArray = undefined;

    this.renderTarget.setSize(width, height);
  }

  private render(projectionMatrix: number[], worldMatrix: number[], renderMode: RenderMode) {
    const renderer = this.renderer;

    this.camera.projectionMatrix.fromArray(projectionMatrix);
    this.camera.matrix.fromArray(worldMatrix);
    this.camera.matrixWorldNeedsUpdate = true;

    this.tileSelectionMaterial.uniforms.renderScale.value = 0.25;
    this.tileSelectionMaterial.uniforms.subsamplingFactor.value = 1.2;

    this.camera.layers.set(renderMode === RenderMode.GLOBE ? GLOBE_LAYER : MAP_LAYER);

    renderer.setClearColor(0, 0);
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
  }

  private renderDebug() {
    const renderer = this.renderer;

    this.fsQuad.material.uniforms.buf.value = this.renderTarget.texture;

    renderer.setRenderTarget(null);
    this.fsQuad.render(renderer);
  }

  private async collectData(): Promise<string[]> {
    const {width, height} = this.renderTarget;
    const renderer = this.renderer;

    if (!this.rgbaArray) {
      this.rgbaArray = new Uint8Array(4 * width * height);
    }

    // readRenderTargetPixels is used only when running in a worker with OffscreenCanvcas
    // (in this case doing it synchronously is perfectly fine) or when other means aren't
    // available (WebGL1)
    if (!renderer.capabilities.isWebGL2 || this.options!.useWorker) {
      renderer.readRenderTargetPixels(this.renderTarget, 0, 0, width, height, this.rgbaArray);
    } else {
      const texture = this.renderTarget.texture;
      const texFmt = this.rendererUtils.convert(texture.format)!;
      const texType = this.rendererUtils.convert(texture.type)!;
      const gl = renderer.getContext() as WebGL2RenderingContext;

      await readPixelsAsync(gl, 0, 0, width, height, texFmt, texType, this.rgbaArray);
    }

    // use a Set to get unique uint32 values, then convert it back to uint8 to
    // read rgba-bytes while preserving endianness
    const uniqueTileIds = new Set(new Uint32Array(this.rgbaArray.buffer));
    const u32Tiles = new Uint32Array(Array.from(uniqueTileIds));
    const u8Tiles = new Uint8Array(u32Tiles.buffer);

    const tiles: string[] = [];

    for (let i = 0; i < u8Tiles.length; i += 4) {
      if (u8Tiles[i + 3] === 0) continue;

      const [x, y, zoom] = u8Tiles.subarray(i, i + 4);
      tiles.push(TileId.createStringId(x, y, zoom));
    }

    return tiles;
  }

  private initRenderer() {
    this.canvas = this.createCanvas();

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: true
    });

    this.renderTarget = new WebGLRenderTarget(DEFAULT_WIDTH, DEFAULT_HEIGHT, {
      depthBuffer: false,
      generateMipmaps: false
    });

    this.rendererUtils = new WebGLUtils(
      this.renderer.getContext(),
      this.renderer.extensions,
      this.renderer.capabilities
    );
  }

  private createCanvas() {
    const width = DEFAULT_WIDTH;
    const height = DEFAULT_HEIGHT;

    if (typeof OffscreenCanvas !== 'undefined' && this.options && this.options.useOffscreenCanvas) {
      return new OffscreenCanvas(width, height);
    }

    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;

    if (this.isDebugMode) {
      c.style.cssText = `
        position: absolute; 
        z-index: 99; 
        top: 0; left: 0; 
        width: 25vw; height: 25vh; 
        border: 1px solid white; 
        background: repeating-conic-gradient(#808080 0% 25%, white 0% 50%) 
                50% / 20px 20px;
      `;

      document.body.appendChild(c);
    }

    return c;
  }
}
