import {PerspectiveCamera, Vector3} from 'three';
import {Renderer} from './renderer';
import {lngLatToWorldSpace} from './lib/lnglat-to-world';

type Position = [number, number];

interface MarkerOptions {
  html: string;
  renderer: Renderer;
  lngLat: Position;
  offset: [number, number];
}

export class MarkerHtml {
  private container!: HTMLDivElement;
  private active: boolean = true;
  private camera: PerspectiveCamera;
  private lastCameraPosition: Vector3;

  constructor(options: MarkerOptions) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.innerHTML = options.html;
    this.container.style.willChange = 'transform';
    this.container.style.transform = `translate(${options.offset[0]}px, ${options.offset[1]}px)`;
    document.body.appendChild(this.container);

    this.camera = options.renderer.camera;
    const position = new Vector3();
    const projected = new Vector3(0, 0, 0);
    this.lastCameraPosition = new Vector3(-99999, -99999, -99999);

    lngLatToWorldSpace(options.lngLat, position);

    const updatePosition = () => {
      if (!this.active) {
        return;
      }

      // skip if the camera position has not changed since last time
      if (this.camera.position.equals(this.lastCameraPosition)) {
        requestAnimationFrame(updatePosition.bind(this));
        return;
      }

      // check occlusion
      const proj = projected.copy(position).projectOnVector(this.camera.position);
      const l1 = proj.add(this.camera.position).length();
      const l2 = this.camera.position.length();
      const occluded = l1 < l2;

      this.container.style.zIndex = occluded ? '0' : '2';

      // update css position
      this.camera.updateMatrixWorld();
      // re-use projected vector
      projected.copy(position).project(this.camera).addScalar(1).divideScalar(2);

      const left = projected.x * 100;
      const top = 100 - projected.y * 100;
      this.container.style.left = `${left}%`;
      this.container.style.top = `${top}%`;

      this.lastCameraPosition.copy(this.camera.position);

      requestAnimationFrame(updatePosition.bind(this));
    };

    updatePosition();
  }

  destroy() {
    this.container.parentElement?.removeChild(this.container);
    this.active = false;
  }
}
