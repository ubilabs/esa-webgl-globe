import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {Globe, TileDefinition} from './globe/globe';

interface RendererOptions {
  container?: HTMLElement;
}

export class Renderer {
  container: HTMLElement;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  webglRenderer!: THREE.Renderer;
  controls!: OrbitControls;
  globe!: Globe;

  constructor(options: RendererOptions = {}) {
    this.container = options.container || document.body;
    this.initScene();
    this.addResizeListener();
    this.animate();
  }

  private initScene() {
    // camera
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.001, 5);
    this.camera.position.z = 3;
    this.camera.position.y = 0;

    // scene
    this.scene = new THREE.Scene();

    // renderer
    this.webglRenderer = new THREE.WebGLRenderer({antialias: true});
    this.webglRenderer.setSize(window.innerWidth, window.innerHeight);
    // @ts-ignore
    this.webglRenderer.setAnimationLoop(this.animate.bind(this));
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
    this.globe = new Globe({
      scene: this.scene,
      projection: 0,
      renderOffset: 0
    });
  }

  private animate() {
    this.webglRenderer.render(this.scene, this.camera);
    this.controls.update();
    const cameraDistance = this.camera.position.length() - 1;
    this.controls.rotateSpeed = Math.max(0.05, Math.min(1.0, cameraDistance - 0.2));
  }

  private addResizeListener() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.webglRenderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
  }

  async updateTiles(tiles: TileDefinition[]) {
    this.globe.updateTiles(tiles);
  }
}
