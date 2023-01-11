import {
  BufferGeometry,
  Float32BufferAttribute,
  Material,
  Mesh,
  OrthographicCamera,
  WebGLRenderer
} from 'three';

const _camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

// static fullscreen triangle geometry
const _geometry = new BufferGeometry();
_geometry.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));

_geometry.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

export class FullScreenQuad<TMat extends Material> {
  private readonly mesh: Mesh<BufferGeometry, TMat>;

  constructor(material: TMat) {
    this.mesh = new Mesh(_geometry, material);
  }

  render(renderer: WebGLRenderer) {
    renderer.render(this.mesh, _camera);
  }

  get material(): TMat {
    return this.mesh.material;
  }

  set material(value: TMat) {
    this.mesh.material = value;
  }

  dispose() {
    this.mesh.geometry.dispose();
  }
}
