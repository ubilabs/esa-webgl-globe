import {OrthographicCamera, PerspectiveCamera, Scene, Vector2, WebGLRenderer} from 'three';

// @ts-ignore
import {OrbitControls} from './vendor/orbit-controls.js';
import {MapControls} from 'three/examples/jsm/controls/MapControls';
import {TileManager} from './tile-manager';
import {MarkerHtml} from './marker-html';
import {lngLatDistToWorldSpace, worldSpaceToLngLatDist} from './lib/convert-spaces';
import type {RendererProps} from './types/renderer';
import {RenderMode} from './types/renderer';

import type {RenderTile} from './types/tile';
import type {LngLatDist} from './types/lng-lat-dist';
import type {MarkerProps} from './types/marker';
import {MAP_HEIGHT, MAP_WIDTH} from './config';

export class Renderer extends EventTarget {
  readonly container: HTMLElement;

  private readonly webglRenderer: WebGLRenderer;
  private readonly scene: Scene = new Scene();
  private readonly globeCamera: PerspectiveCamera = new PerspectiveCamera();
  private readonly mapCamera: OrthographicCamera = new OrthographicCamera();

  private globeControls: OrbitControls;
  private mapControls: MapControls;

  private tileManager: TileManager;
  private cameraView?: LngLatDist;
  private skipViewUpdate: boolean = false;
  private markersById: Record<string, MarkerHtml> = {};
  private renderMode: RenderMode = RenderMode.GLOBE;
  private rendererSize: Vector2 = new Vector2();

  constructor(props: RendererProps = {}) {
    super();

    this.container = props.container || document.body;

    const renderer = new WebGLRenderer({antialias: true});
    renderer.setClearColor(0xffffff, 0);
    renderer.setAnimationLoop(this.animationLoopUpdate.bind(this));
    this.webglRenderer = renderer;

    this.container.appendChild(this.webglRenderer.domElement);
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    this.tileManager = new TileManager(this.scene);

    this.configureCameras();

    this.globeControls = new OrbitControls(this.globeCamera, this.webglRenderer.domElement);
    this.mapControls = new MapControls(this.mapCamera, this.webglRenderer.domElement);

    this.configureControls();

    const {width, height} = this.container.getBoundingClientRect();
    this.resize(width, height);
  }

  getRenderMode() {
    return this.renderMode;
  }

  setRenderMode(renderMode: RenderMode) {
    this.renderMode = renderMode;

    // switch to appropriate controls
    this.globeControls.enabled = this.renderMode === RenderMode.GLOBE;
    this.mapControls.enabled = this.renderMode === RenderMode.MAP;

    this.tileManager.setRenderMode(renderMode);
  }

  resize(width: number, height: number) {
    this.rendererSize.set(width, height);
    this.webglRenderer.setSize(width, height);

    const aspectRatio = width / height;

    this.globeCamera.aspect = aspectRatio;
    this.globeCamera.updateProjectionMatrix();

    const halfWidth = MAP_WIDTH / 2;
    this.mapCamera.top = halfWidth / aspectRatio;
    this.mapCamera.bottom = -halfWidth / aspectRatio;
  }

  getRendererSize() {
    return this.rendererSize;
  }

  updateTiles(tiles: RenderTile[]) {
    this.tileManager.updateTiles(tiles);
  }

  getCamera() {
    if (this.renderMode === RenderMode.GLOBE) return this.globeCamera;

    return this.mapCamera;
  }

  setCameraView(cameraView: LngLatDist) {
    if (cameraView === this.cameraView || this.skipViewUpdate) {
      return;
    }

    lngLatDistToWorldSpace(cameraView, this.globeCamera.position);
    this.skipViewUpdate = true;
    this.globeControls.update();
    this.cameraView = cameraView;
  }

  setMarkers(markerProps: MarkerProps[]) {
    // remove markers that are no longer needeed
    const newMarkerIds = markerProps.map(m => m.id);
    const toRemove = Object.keys(this.markersById).filter(id => !newMarkerIds.includes(id));

    for (const markerId of toRemove) {
      this.markersById[markerId].destroy();
    }

    for (let props of markerProps) {
      // known markers get updated
      const knownMarker = this.markersById[props.id];

      if (knownMarker) {
        knownMarker.setProps(props);
        continue;
      }

      // otherwise create the marker
      this.markersById[props.id] = new MarkerHtml(this, props);
    }
  }

  destroy() {
    this.webglRenderer.dispose();
    this.webglRenderer.setAnimationLoop(null);
    this.webglRenderer.domElement.remove();
  }

  private configureCameras() {
    const {width, height} = this.container.getBoundingClientRect();
    const aspectRatio = width / height;
    this.globeCamera.fov = 35;
    this.globeCamera.aspect = aspectRatio;
    this.globeCamera.near = 0.001;
    this.globeCamera.far = 100;
    this.globeCamera.zoom = 1;
    this.globeCamera.position.set(0, 0, 5);
    this.globeCamera.updateProjectionMatrix();

    const halfWidth = MAP_WIDTH / 2;
    this.mapCamera.left = -halfWidth;
    this.mapCamera.right = halfWidth;
    this.mapCamera.top = halfWidth / aspectRatio;
    this.mapCamera.bottom = -halfWidth / aspectRatio;
    this.mapCamera.near = 0.1;
    this.mapCamera.far = 2;
    this.mapCamera.position.set(0, 0, 1);
    this.mapCamera.updateProjectionMatrix();
  }

  private configureControls() {
    this.globeControls.enableDamping = true;
    this.globeControls.dampingFactor = 0.1;
    this.globeControls.enablePan = false;
    this.globeControls.enableZoom = true;
    this.globeControls.rotateSpeed = 1;
    this.globeControls.maxPolarAngle = Math.PI;
    this.globeControls.minPolarAngle = 0;
    this.globeControls.minDistance = 1.05; // ~ zoom level 7
    this.globeControls.addEventListener('change', () => {
      const view = worldSpaceToLngLatDist(this.globeCamera.position);
      const event = new CustomEvent<LngLatDist>('cameraViewChanged', {detail: view});
      this.dispatchEvent(event);
    });

    this.mapControls.enableRotate = false;
    this.mapControls.enablePan = true;
    this.mapControls.enableZoom = true;
    this.mapControls.screenSpacePanning = true;
    this.mapControls.minZoom = 1;
    this.mapControls.maxZoom = 20;

    const origUpdate = this.mapControls.update.bind(this.mapControls);

    // override the update-function to implement bounds-limiting
    this.mapControls.update = () => {
      origUpdate();

      const camera = this.mapCamera;
      const controls = this.mapControls;

      const dx = (camera.right - camera.left) / (2 * camera.zoom);
      const dy = (camera.top - camera.bottom) / (2 * camera.zoom);

      const xMax = Math.max(0, MAP_WIDTH / 2 - dx);
      const yMax = Math.max(0, MAP_HEIGHT / 2 - dy);

      const x = Math.max(-xMax, Math.min(xMax, camera.position.x));
      const y = Math.max(-yMax, Math.min(yMax, camera.position.y));

      camera.position.x = controls.target.x = x;
      camera.position.y = controls.target.y = y;

      return true;
    };

    this.globeControls.enabled = this.renderMode === RenderMode.GLOBE;
    this.mapControls.enabled = this.renderMode === RenderMode.MAP;
  }

  private animationLoopUpdate() {
    this.skipViewUpdate = false;

    if (this.globeControls.enabled) {
      this.globeControls.update();
      const cameraDistance = this.globeCamera.position.length() - 1;
      this.globeControls.rotateSpeed = Math.max(0.05, Math.min(1.0, cameraDistance - 0.2));
    } else if (this.mapControls.enabled) {
      this.mapControls.update();
    }

    this.webglRenderer.render(this.scene, this.getCamera());
  }
}
