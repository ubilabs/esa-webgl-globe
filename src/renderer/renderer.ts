import {PerspectiveCamera, Scene, WebGLRenderer} from 'three';

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {TileCollection} from './tile-collection';

import type {RenderTile} from './types/tile';

export interface RendererProps {
  container?: HTMLElement;
}

export class Renderer {
  container: HTMLElement;
  camera!: PerspectiveCamera;
  scene!: Scene;
  webglRenderer!: WebGLRenderer;
  controls!: OrbitControls;
  tileCollection!: TileCollection;

  constructor(options: RendererProps = {}) {
    this.container = options.container || document.body;
    this.initScene();

    this._addResizeListener();
    this._animate();
  }

  private initScene() {
    // camera
    const {width, height} = this.container.getBoundingClientRect();
    this.camera = new PerspectiveCamera(70, width / height, 0.001, 100);
    this.camera.position.z = 10;
    this.camera.position.y = 0;
    this.camera.zoom = 5;
    this.camera.updateProjectionMatrix();

    // scene
    this.scene = new Scene();

    // renderer
    this.webglRenderer = new WebGLRenderer({antialias: true});
    this.webglRenderer.setSize(width, height);
    this.webglRenderer.setClearColor(0xffffff, 0);
    this.webglRenderer.setAnimationLoop(this._animate.bind(this));
    this.container.appendChild(this.webglRenderer.domElement);

    // controls
    this.controls = new OrbitControls(this.camera, this.webglRenderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 0.5;
    this.controls.rotateSpeed = 1;
    this.controls.maxPolarAngle = Math.PI / 2 + Math.PI / 2;
    this.controls.minPolarAngle = Math.PI / 2 - Math.PI / 2;
    this.controls.minDistance = 1.05; // ~ zoom level 7

    // globe
    this.tileCollection = new TileCollection({scene: this.scene});
  }

  private _animate() {
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

  destroy() {
    window.removeEventListener('resize', this._resize);
  }
}
