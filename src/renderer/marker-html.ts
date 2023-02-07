import {Vector3} from 'three';
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

  constructor(options: MarkerOptions) {
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.innerHTML = options.html;
    this.container.style.transform = `translate(${options.offset[0]}px, ${options.offset[1]}px)`;
    document.body.appendChild(this.container);

    const camera = options.renderer.camera;
    const position = new Vector3();
    const projected = new Vector3(0, 0, 0);

    lngLatToWorldSpace(options.lngLat, position);

    const checkOcclusion = () => {
      if (!this.active) {
        return;
      }
      const proj = projected.copy(position).projectOnVector(camera.position);
      const l1 = proj.add(camera.position).length();
      const l2 = camera.position.length();
      const occluded = l1 < l2;

      this.container.style.zIndex = occluded ? '0' : '2';

      // re-use vector
      camera.updateMatrixWorld();
      projected.copy(position).project(options.renderer.camera).addScalar(1).divideScalar(2);

      const left = projected.x * 100;
      const top = 100 - projected.y * 100;
      this.container.style.left = `${left}%`;
      this.container.style.top = `${top}%`;

      requestAnimationFrame(checkOcclusion.bind(this));
    };
    checkOcclusion();
  }

  destroy() {
    this.container.parentElement?.removeChild(this.container);
    this.active = false;
  }
}
