import {
  Sprite,
  SpriteMaterial,
  Scene,
  Vector3,
  UVMapping,
  CanvasTexture,
  PerspectiveCamera
} from 'three';
import type {Renderer} from './renderer';

type Position = [number, number];

interface MarkerOptions {
  image: HTMLCanvasElement;
  renderer: Renderer;
  anchor: [number, number];
  lngLat: Position;
}

export class Marker {
  private sprite: Sprite;
  private scene: Scene;
  private camera: PerspectiveCamera;

  constructor(options: MarkerOptions) {
    const texture = new CanvasTexture(options.image);
    texture.mapping = UVMapping;
    const material = new SpriteMaterial({map: texture});
    material.sizeAttenuation = false;
    this.sprite = new Sprite(material);
    geoPositionToWorldSpace(options.lngLat, this.sprite.position);
    this.sprite.center.set(...options.anchor);
    this.sprite.scale.set(0.1, 0.01, 0.1);
    this.sprite.renderOrder = 1e6;

    this.scene = options.renderer.scene;
    this.scene.add(this.sprite);
    this.camera = options.renderer.camera;

    const projected = new Vector3(0, 0, 0);

    // Check if marker should be occluded
    // * project marker position onto camera view vector
    // * compare if projected marker length or camera to world center length is longer
    // * set renderOrder accordingly
    const checkOcclusion = () => {
      const proj = projected.copy(this.sprite.position).projectOnVector(this.camera.position);
      const l1 = proj.add(this.camera.position).length();
      const l2 = this.camera.position.length();
      const occluded = l1 < l2;

      this.sprite.renderOrder = occluded ? 0 : 1e6;

      requestAnimationFrame(checkOcclusion.bind(this));
    };

    checkOcclusion();
  }
}

function geoPositionToWorldSpace(position: Position, out: Vector3) {
  const lngR = (position[0] * Math.PI) / 180;
  const latR = (position[1] * Math.PI) / 180;
  const py = Math.sin(latR);
  const cf = Math.sqrt(1.0 - Math.pow(py, 2.0));
  const x = Math.sin(lngR / 2) * cf;
  const y = py;
  const z = Math.cos(lngR / 2) * cf;
  out.set(x, y, z);
}
