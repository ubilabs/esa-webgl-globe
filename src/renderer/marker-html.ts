import {Vector3} from 'three';
import {latLngAltitudeToGlobePosition} from './lib/convert-spaces';
import {Renderer} from './renderer';
import {RenderMode} from './types/renderer';

import type {MarkerProps} from './types/marker';

const v3 = new Vector3();

export class MarkerHtml {
  readonly id: string;

  private readonly renderer: Renderer;
  private readonly markerEl: HTMLDivElement;
  private props: MarkerProps;
  private rafId: number = 0;

  private globePosition: Vector3 = new Vector3();
  private mapPosition: Vector3 = new Vector3();

  constructor(renderer: Renderer, props: MarkerProps) {
    this.id = props.id;
    this.props = props;
    this.renderer = renderer;

    this.markerEl = document.createElement('div');
    this.markerEl.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      will-change: transform;
    `;
    renderer.container.appendChild(this.markerEl);

    this.markerEl.addEventListener('pointerdown', ev => {
      this.markerEl.setPointerCapture(ev.pointerId);
      this.markerEl.addEventListener('pointerup', () => this.handleMarkerClick(), {once: true});

      // need to stop propagation here, otherwise the OrbitControls will
      // pick up the event and prevent any other event from coming through
      // via setPointerCapture().
      ev.stopPropagation();
    });

    // this.markerEl.addEventListener('click', this.handleMarkerClick);

    this.setProps(this.props);

    this.rafId = requestAnimationFrame(this.update);
  }

  private update = () => {
    this.rafId = requestAnimationFrame(this.update);
    this.updatePosition();
  };

  updatePosition() {
    const camera = this.renderer.getCamera();
    const renderMode = this.renderer.getRenderMode();
    const {width, height} = this.renderer.getRendererSize();

    let occluded = false;
    if (renderMode === RenderMode.GLOBE) {
      occluded = this.globePosition.dot(camera.position) < 0;
      v3.copy(this.globePosition).project(camera);
    } else {
      v3.copy(this.mapPosition).project(camera);
    }

    const left = ((v3.x + 1) / 2) * width;
    const top = (1 - (v3.y + 1) / 2) * height;

    this.markerEl.style.transform = `translate(${left}px, ${top}px)`;
    this.markerEl.style.zIndex = occluded ? '0' : '2';
  }

  setProps(props: MarkerProps) {
    this.props = {...this.props, ...props};
    this.markerEl.innerHTML = this.props.html;

    let {lat, lng} = this.props;
    latLngAltitudeToGlobePosition({lng, lat, altitude: 1}, this.globePosition);

    this.mapPosition.set(lng / 90, lat / 90, 0);

    this.updatePosition();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);

    this.markerEl.removeEventListener('click', this.handleMarkerClick);
    this.markerEl.remove();
  }

  private handleMarkerClick = () => {
    if (!this.props.onClick) {
      return;
    }

    this.props.onClick(this.id);
  };
}
