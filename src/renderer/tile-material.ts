import {
  GreaterStencilFunc,
  KeepStencilOp,
  ReplaceStencilOp,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Texture,
  IUniform
} from 'three';
import {TileId} from '../tile-id';
import {ZOOM_SEGMENT_MAP} from './config';

type TileMaterialUniforms = {
  tile: IUniform<[x: number, y: number, zoom: number]>;
  numTiles: IUniform<[x: number, y: number]>;
  numSegments: IUniform<number>;
  texture0: IUniform<Texture | null>;
  texture1: IUniform<Texture | null>;
  textureFade: IUniform<number>;
  projection: IUniform<number>;
  isFullSize: IUniform<boolean>;
};

type TileMaterialOptions = {
  tileId: TileId;
  zIndex: number;
  isFullSize: boolean;
  texture?: Texture;
};

export class TileMaterial extends RawShaderMaterial {
  isTileMaterial = true;
  type = 'TileMaterial';

  // uniforms
  uniforms: TileMaterialUniforms = {
    tile: {value: [0, 0, 0]},
    numTiles: {value: [2, 1]},
    numSegments: {value: 1},
    texture0: {value: null},
    texture1: {value: null},
    textureFade: {value: 0},
    projection: {value: 0},
    isFullSize: {value: false}
  };

  declare tile: TileId;
  declare numTiles: [x: number, y: number];
  declare numSegments: number;
  declare texture0: Texture | null;
  declare texture1: Texture | null;
  declare textureFade: number;
  declare projection: number;
  declare isFullSize: boolean;

  // language=GLSL
  vertexShader = `
    #define PI 3.141592653589793
  
    precision mediump float;
    precision mediump int;
  
    attribute vec3 position;
  
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
  
    varying vec2 vUv;
    varying vec2 vTileUv;
    varying vec2 vGlobalUv;
  
    uniform vec3 tile;
    uniform vec2 numTiles;
    uniform float projection;
    uniform float size;
    uniform float isFullSize;
  
    // all incoming geometries are subdivided 2x2 plane geometries in
    // the z=0 plane, so spanning from (-1, -1) to (1, 1)
  
    void main() {
      // convert position [-1...1] to [0...1]
      vTileUv = position.xy / 2.0 + vec2(0.5);
  
      // divide uv coords by tile count and offset by tile position
      vGlobalUv = (tile.xy + vTileUv) / numTiles;
  
      if (isFullSize == 0.0) {
        vUv = vTileUv;
      } else {
        vUv = vGlobalUv;
      }
  
      // size of the tiles at the current zoom-level in a 2x1 rectangular map
      float tileSize = 1.0 / numTiles.y;
  
      // lower left corner of the tile in a 2x1 rectangle,
      // offset by (-1, -0.5) to center the map around (0,0)
      vec2 tileRef = tile.xy * tileSize - vec2(1.0, 0.5);
  
      // add offset for the current vertex so that the quad vertices lie around
      // the tile's center. "(position / 2) + vec2(0.5)" converts the position from 
      // range [-1..1] to [0..1], which is then added to the bottom left reference point.
      vec2 vertexOffset = (position.xy / 2.0 + vec2(0.5)) * tileSize;
  
      // the map-position is now the vertex-position on our 2x1 rectangular map
      vec2 mapPosition = tileRef + vertexOffset;
  
      // spherical projection
      // longitude (ll.x) in range [-PI..PI], latitude (ll.y) in range [-PI/2..PI/2]
      vec2 ll = mapPosition * PI;
      float sinLat = sin(ll.y);
      float cosLat = cos(ll.y);
  
      vec3 sphericalPosition = vec3(
        sin(ll.x) * cosLat,
        sinLat,
        cos(ll.x) * cosLat
      );
  
      // equirectangular (results in a 4x2 sized rectangle in the z=0 plane
      vec3 equirectangularPosition = vec3(2.0 * mapPosition, 0.0);
  
      // morph between spherical and equirectangular position
      vec3 finalPos = mix(sphericalPosition, equirectangularPosition, projection);
  
      gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
    }
  `;

  // language=GLSL
  fragmentShader = `
    precision mediump float;
    precision mediump int;
  
    varying vec2 vUv;
    varying vec2 vTileUv;
    varying vec2 vGlobalUv;
  
    uniform sampler2D texture0;
    uniform sampler2D texture1;
    uniform float textureFade;
  
    void main() {
      vec4 tex0 = texture2D(texture0, vUv);
      vec4 tex1 = texture2D(texture1, vUv);
  
      gl_FragColor = mix(tex0, tex1, textureFade);
    }
  `;

  constructor(options: TileMaterialOptions) {
    super({
      transparent: true,
      depthTest: false,
      stencilWrite: true,
      stencilFunc: GreaterStencilFunc,
      stencilFail: KeepStencilOp,
      stencilZFail: KeepStencilOp,
      stencilZPass: ReplaceStencilOp,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      stencilRef: options.zIndex + 1
    });

    this.tile = options.tileId;
    this.isFullSize = options.isFullSize;

    if (options.texture) {
      this.texture0 = options.texture;
      this.textureFade = 0;
    }
  }

  // static initializer to setup properties for uniforms on the prototype.
  static {
    // special handling for the 'tile' uniform
    Object.defineProperty(this.prototype, 'tile', {
      get(this: TileMaterial) {
        const [x, y, zoom] = this.uniforms.tile.value;
        return TileId.fromXYZ(x, y, zoom);
      },
      set(this: TileMaterial, tileId: TileId) {
        this.uniforms.tile.value = [tileId.x, tileId.y, tileId.zoom];
        this.numTiles = [2 << tileId.zoom, 1 << tileId.zoom];
        this.numSegments = ZOOM_SEGMENT_MAP[tileId.zoom];
      }
    });

    const uniforms = [
      'numTiles',
      'numSegments',
      'texture0',
      'texture1',
      'textureFade',
      'projection',
      'isFullSize'
    ] as const;

    for (let uniformName of uniforms) {
      Object.defineProperty(this.prototype, uniformName, {
        get(this: TileMaterial) {
          return this.uniforms[uniformName].value;
        },
        set(this: TileMaterial, value) {
          this.uniforms[uniformName].value = value;
        }
      });
    }
  }
}
