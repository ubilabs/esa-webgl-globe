import {PerspectiveCamera, Scene, WebGLRenderer} from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {TileCollection} from './tile-collection';
import {MarkerHtml} from './marker-html';
import {lngLatDistToWorldSpace, worldSpaceToLngLatDist} from './lib/convert-spaces';

import type {RenderTile} from './types/tile';
import type {RendererProps} from './types/renderer';
import type {LngLatDist} from './types/lng-lat-dist';
import type {MarkerProps} from './types/marker';

export class Renderer extends EventTarget {
  private container: HTMLElement;
  camera!: PerspectiveCamera;
  private scene!: Scene;
  private webglRenderer!: WebGLRenderer;
  private controls!: OrbitControls;
  private tileCollection!: TileCollection;
  private cameraView?: LngLatDist;
  private skipViewUpdate: boolean = false;
  private markersById: Record<string, MarkerHtml> = {};

  constructor(options: RendererProps = {}) {
    super();

    this.container = options.container || document.body;
    this.initScene();

    this._addResizeListener();
    this._animate();
  }

  private initScene() {
    // camera
    const {width, height} = this.container.getBoundingClientRect();
    this.camera = new PerspectiveCamera(90, width / height, 0.001, 100);
    this.camera.position.z = 5;
    this.camera.position.y = 0;
    this.camera.zoom = 3.5;
    this.camera.updateProjectionMatrix();

    // scene
    this.scene = new Scene();

    // renderer
    this.webglRenderer = new WebGLRenderer({antialias: true});
    this.webglRenderer.setSize(width, height);
    this.webglRenderer.setClearColor(0xffffff, 0);
    this.webglRenderer.setAnimationLoop(this._animate.bind(this));
    this.container.appendChild(this.webglRenderer.domElement);
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';

    // controls
    this.controls = new OrbitControls(this.camera, this.webglRenderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.5;
    this.controls.rotateSpeed = 1;
    this.controls.maxPolarAngle = Math.PI / 2 + Math.PI / 2;
    this.controls.minPolarAngle = Math.PI / 2 - Math.PI / 2;
    this.controls.minDistance = 1.05; // ~ zoom level 7
    this.controls.addEventListener('change', () => {
      const view = worldSpaceToLngLatDist(this.camera.position);
      const event = new CustomEvent<LngLatDist>('cameraViewChanged', {detail: view});
      this.dispatchEvent(event);
    });

    // globe
    this.tileCollection = new TileCollection({scene: this.scene});
  }

  private _animate() {
    this.skipViewUpdate = false;
    this.webglRenderer.render(this.scene, this.camera);
    this.controls.update();
    const cameraDistance = this.camera.position.length() - 1;
    this.controls.rotateSpeed = Math.max(0.05, Math.min(1.0, cameraDistance - 0.2));
  }

  private _addResizeListener() {
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
  }

  private _resize() {
    const {width, height} = this.container.getBoundingClientRect();
    this.webglRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  updateTiles(tiles: RenderTile[]) {
    this.tileCollection.updateTiles(tiles);
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
    window.removeEventListener('resize', this._resize);
  }
}
