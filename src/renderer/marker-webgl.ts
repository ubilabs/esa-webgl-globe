import {
  Scene,
  Vector3,
  CanvasTexture,
  BufferGeometry,
  BufferAttribute,
  ShaderMaterial,
  Mesh,
  Vector2,
  NearestFilter
} from 'three';
import type {Renderer} from './renderer';
import vertexShader from './shader/marker/vertex.glsl';
import fragmentShader from './shader/marker/fragment.glsl';
import {lngLatToWorldSpace} from './lib/lnglat-to-world';

type Position = [number, number];

interface MarkerOptions {
  image: HTMLCanvasElement;
  renderer: Renderer;
  lngLat: Position;
  anchor: [number, number];
  offset: [number, number];
}

export class MarkerWebGl {
  private mesh: Mesh;
  private scene: Scene;
  screenPosition: Vector3 = new Vector3();

  constructor(options: MarkerOptions) {
    const texture = new CanvasTexture(options.image);
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    const geometry = this._getGeometry();
    const material = this._getMaterial({
      lngLat: options.lngLat,
      texture,
      anchor: options.anchor,
      offset: options.offset
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.renderOrder = 1e6;
    this.scene = options.renderer.scene;
    this.scene.add(this.mesh);

    // Check if marker should be occluded
    // * project marker position onto camera view vector
    // * compare if projected marker length or camera to world center length is longer
    // * set renderOrder accordingly
    const camera = options.renderer.camera;
    const position = new Vector3();
    const projected = new Vector3(0, 0, 0);
    lngLatToWorldSpace(options.lngLat, position);
    const checkOcclusion = () => {
      const proj = projected.copy(position).projectOnVector(camera.position);
      const l1 = proj.add(camera.position).length();
      const l2 = camera.position.length();
      const occluded = l1 < l2;
      this.mesh.renderOrder = occluded ? 0 : 1e6;

      // only for html markers
      this.screenPosition.copy(position).project(camera);

      requestAnimationFrame(checkOcclusion.bind(this));
    };
    checkOcclusion();

    // listen to resize evetns to update the resolution uniform
    this._addResizeListener();
  }

  destroy() {
    this.scene.remove(this.mesh);

    isArray(this.mesh.material)
      ? this.mesh.material.forEach(m => m.dispose())
      : this.mesh.material.dispose();

    this.mesh.geometry.dispose();
  }

  private _getGeometry() {
    // simple quad with 2 triangles a 3 points
    // we will calculate the scale and final vertex positions in the vertex shader
    const geometry = new BufferGeometry();

    // prettier-ignore
    const points =[
      [-1.0, -1.0, 0],
      [1.0, -1.0, 0],
      [1.0, 1.0, 0],
      [1.0, 1.0, 0],
      [-1.0, 1.0, 0],
      [-1.0, -1.0, 0]
    ].flat()
    const vertices = new Float32Array(points);
    geometry.setAttribute('position', new BufferAttribute(vertices, 3));
    return geometry;
  }

  private _getMaterial({
    lngLat,
    texture,
    anchor,
    offset
  }: {
    lngLat: Position;
    texture: CanvasTexture;
    anchor: [number, number];
    offset: [number, number];
  }) {
    const {width, height} = texture.image;
    const uniforms = {
      lngLat: {value: lngLat},
      tex: {value: texture},
      resolution: {value: new Vector2(window.innerWidth, window.innerHeight)},
      size: {value: new Vector2(width, height)},
      anchor: {value: new Vector2(...anchor)},
      offset: {value: new Vector2(offset[0], -offset[1])}
    };

    return new ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false
    });
  }

  private _addResizeListener() {
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
  }

  private _resize() {
    // @ts-ignore
    this.mesh.material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  }
}

// array type guard
function isArray<T>(input: any[] | any): input is T[] {
  return Array.isArray(input);
}
