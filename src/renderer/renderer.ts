import {PerspectiveCamera, Scene, WebGLRenderer} from 'three';

// @ts-ignore
import {OrbitControls} from './vendor/orbit-controls.js';
import {TileManager} from './tile-manager';
import {MarkerHtml} from './marker-html';
import {lngLatDistToWorldSpace, worldSpaceToLngLatDist} from './lib/convert-spaces';

import type {RenderTile} from './types/tile';
import type {RendererProps} from './types/renderer';
import type {LngLatDist} from './types/lng-lat-dist';
import type {MarkerProps} from './types/marker';

export class Renderer extends EventTarget {
  private readonly container: HTMLElement;
  private readonly webglRenderer: WebGLRenderer;
  private readonly scene: Scene = new Scene();
  readonly camera: PerspectiveCamera = new PerspectiveCamera();

  private controls: OrbitControls;
  private tileManager: TileManager;
  private cameraView?: LngLatDist;
  private skipViewUpdate: boolean = false;
  private markersById: Record<string, MarkerHtml> = {};

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

    this.initCamera();
    this.initControls();

    const {width, height} = this.container.getBoundingClientRect();
    this.resize(width, height);
  }

  resize(width: number, height: number) {
    this.webglRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  updateTiles(tiles: RenderTile[]) {
    this.tileManager.updateTiles(tiles);
  }

  setCameraView(cameraView: LngLatDist) {
    if (cameraView === this.cameraView || this.skipViewUpdate) {
      return;
    }

    lngLatDistToWorldSpace(cameraView, this.camera.position);
    this.skipViewUpdate = true;
    this.controls.update();
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
      this.markersById[props.id] = new MarkerHtml({
        props,
        camera: this.camera,
        container: this.container
      });
    }
  }

  destroy() {
    // TODO threejs cleanup?
  }

  private initCamera() {
    const {width, height} = this.container.getBoundingClientRect();
    this.camera.fov = 35;
    this.camera.aspect = width / height;
    this.camera.near = 0.001;
    this.camera.far = 100;
    this.camera.zoom = 1;

    this.camera.position.set(0, 0, 5);

    this.camera.updateProjectionMatrix();
  }

  private initControls() {
    this.controls = new OrbitControls(this.camera, this.webglRenderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.rotateSpeed = 1;
    this.controls.maxPolarAngle = Math.PI / 2 + Math.PI / 2;
    this.controls.minPolarAngle = Math.PI / 2 - Math.PI / 2;
    this.controls.minDistance = 1.05; // ~ zoom level 7
    this.controls.addEventListener('change', () => {
      const view = worldSpaceToLngLatDist(this.camera.position);
      const event = new CustomEvent<LngLatDist>('cameraViewChanged', {detail: view});
      this.dispatchEvent(event);
    });
  }

  private animationLoopUpdate() {
    this.skipViewUpdate = false;
    this.webglRenderer.render(this.scene, this.camera);

    this.controls.update();

    const cameraDistance = this.camera.position.length() - 1;
    this.controls.rotateSpeed = Math.max(0.05, Math.min(1.0, cameraDistance - 0.2));
  }
}
