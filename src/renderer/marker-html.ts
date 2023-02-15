import {PerspectiveCamera, Vector3} from 'three';
import {lngLatDistToWorldSpace} from './lib/convert-spaces';
import type {MarkerProps} from './types/marker';

interface MarkerOptions {
  props: MarkerProps;
  camera: PerspectiveCamera;
  container: HTMLElement;
}

export class MarkerHtml {
  readonly id: string;
  private markerEl!: HTMLDivElement;
  private camera: PerspectiveCamera;
  private props: MarkerProps;
  private position: Vector3;
  private projected: Vector3;
  private lastCameraPosition: Vector3;
  private active: boolean = true;

  constructor(options: MarkerOptions) {
    this.id = options.props.id;
    this.props = options.props;
    this.markerEl = document.createElement('div');
    this.markerEl.style.position = 'absolute';
    this.markerEl.style.willChange = 'transform';
    options.container.appendChild(this.markerEl);

    if (typeof this.props.onClick === 'function') {
      this.markerEl.addEventListener('click', () => this.props.onClick(this.id));
    }

    this.camera = options.camera;
    this.position = new Vector3();
    this.projected = new Vector3(0, 0, 0);
    this.lastCameraPosition = new Vector3(-99999, -99999, -99999);

    this.setProps(this.props);

    const update = () => {
      if (!this.active) {
        return;
      }

      // skip if the camera position has not changed since last time
      if (this.camera.position.equals(this.lastCameraPosition)) {
        requestAnimationFrame(update.bind(this));
        return;
      }

      this.updatePosition();
      requestAnimationFrame(update.bind(this));
    };

    update();
  }

  updatePosition() {
    // check occlusion
    const proj = this.projected.copy(this.position).projectOnVector(this.camera.position);
    const l1 = proj.add(this.camera.position).length();
    const l2 = this.camera.position.length();
    const occluded = l1 < l2;

    this.markerEl.style.zIndex = occluded ? '0' : '2';

    // update css position
    this.camera.updateMatrixWorld();
    // re-use projected vector
    this.projected.copy(this.position).project(this.camera).addScalar(1).divideScalar(2);

    const left = this.projected.x * 100;
    const top = 100 - this.projected.y * 100;
    this.markerEl.style.left = `${left}%`;
    this.markerEl.style.top = `${top}%`;

    this.lastCameraPosition.copy(this.camera.position);
  }

  setProps(props: MarkerProps) {
    this.props = props;

    this.markerEl.innerHTML = this.props.html;
    this.markerEl.style.transform = `translate(${this.props.offset[0]}px, ${this.props.offset[1]}px)`;
    lngLatDistToWorldSpace({lng: this.props.lng, lat: this.props.lat, distance: 1}, this.position);

    this.updatePosition();
  }

  destroy() {
    this.markerEl.parentElement?.removeChild(this.markerEl);
    this.active = false;
  }
}
