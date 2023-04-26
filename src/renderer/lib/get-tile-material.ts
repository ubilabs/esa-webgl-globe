import {
  GreaterStencilFunc,
  KeepStencilOp,
  ReplaceStencilOp,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial
} from 'three';

// language=GLSL
const vertexShader = `
  #define PI 3.141592653589793

  precision mediump float;
  precision mediump int;

  attribute vec3 position;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;

  varying vec2 vUv;
  varying vec2 vTileUv;
  varying vec2 vGlobalUv;
  varying vec2 vNumTiles;

  uniform vec3 tile;
  uniform float projection;
  uniform float size;
  uniform float isFullSize;

  // all incoming geometries are subdivided 2x2 plane geometries in
  // the z=0 plane, so spanning from (-1, -1) to (1, 1)

  void main() {
    // number of tiles in x- and y-direction from zoom-level
    vNumTiles = vec2(pow(2.0, tile.z)) * vec2(2.0, 1.0);

    // convert position [-1...1] to [0...1]
    vTileUv = position.xy / 2.0 + vec2(0.5);

    // divide uv coords by tile count and offset by tile position
    vGlobalUv = (tile.xy + vTileUv) / vNumTiles;

    if (isFullSize == 0.0) {
      vUv = vTileUv;
    } else {
      vUv = vGlobalUv;
    }

    // size of the tiles at the current zoom-level in a 2x1 rectangular map
    float tileSize = 1.0 / vNumTiles.y;

    // lower left corner of the tile in a 2x1 rectangle,
    // offset by (-1, -0.5) to center the map around (0,0)
    vec2 tileRef = tile.xy * tileSize - vec2(1.0, 0.5);

    // add offset for this vertex so that the quad vertices lie around the tile's center
    // (position / 2) + vec2(0.5) converts the position from range [-1..1] to [0..1], 
    vec2 vertexOffset = (position.xy / 2.0 + vec2(0.5)) * tileSize;

    // the map-position is now the vertex-position on our 2x1 rectangular map
    vec2 mapPosition = tileRef + vertexOffset;

    // spherical projection
    // longitude (ll.x) in range [-PI..PI], latitude (ll.y) in range [-PI/2..PI/2]
    vec2 ll = mapPosition * PI;
    float sinLat = sin(ll.y);
    float cf = sqrt(1.0 - sinLat * sinLat);

    vec3 sphericalPosition = vec3(
      sin(ll.x) * cf,
      sinLat,
      cos(ll.x) * cf
    );

    // equirectangular (results in a 4x2 sized rectangle in the z=0 plane
    vec3 equirectangularPosition = vec3(2.0 * mapPosition, 0.0);

    // morph between spherical and equirectangular position
    vec3 finalPos = mix(sphericalPosition, equirectangularPosition, 1.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  }
`;

// language=GLSL
const fragmentShader = `
  precision mediump float;
  precision mediump int;

  varying vec2 vUv;
  uniform sampler2D texture0;
  uniform sampler2D texture1;
  uniform float textureFade;
  
  uniform float isFullSize;
  
  void main() {
    gl_FragColor = mix(
      texture2D(texture0, vUv), 
      texture2D(texture1, vUv), 
      textureFade
    );
  }
`;

// language=GLSL
const fragmentShaderPole = `
  precision mediump float;
  precision mediump int;

  varying vec2 vUv;
  varying vec2 vTileUv;
  varying vec2 vNumTiles;

  uniform vec3 tile;
  uniform float pole;
  uniform float poleSegments;
  uniform sampler2D texture0;
  uniform sampler2D texture1;
  uniform float textureFade;
  
  uniform float isFullSize;

  void main() {
    // pole = 1 for north pole and 0 for south
  
    float vx = vUv.x;
    float k = 0.0;
    
    float s = (tile.x + 0.5) / vNumTiles.x;
    float poleScale = mix(0.5, s, isFullSize);
  
    // north
    if (pole > 0.5) {
      k = 1.0 - 1.0 / poleSegments;
  
      if (vTileUv.y > k) {
        float f = (vTileUv.y - k) * poleSegments;
        vx = (vUv.x - poleScale) / (1.0 - f) + poleScale;
      }
    } 
    
    else {
      // south
      k = 1.0 / poleSegments;
  
      if (vTileUv.y < k) {
        float f = vTileUv.y * poleSegments;
        vx = (vUv.x - poleScale) / f + poleScale;
      }
    }
  
    vec4 tex0 = texture2D(texture0, vec2(vx, vUv.y));
    vec4 tex1 = texture2D(texture1, vec2(vx, vUv.y));
    
    gl_FragColor = mix(tex0, tex1, textureFade);
  }
`;

const baseOptions = {
  vertexShader,
  transparent: true,
  depthTest: false,
  stencilWrite: true,
  stencilFunc: GreaterStencilFunc,
  stencilFail: KeepStencilOp,
  stencilZFail: KeepStencilOp,
  stencilZPass: ReplaceStencilOp,
  blending: CustomBlending,
  blendSrc: OneFactor,
  blendDst: OneMinusSrcAlphaFactor
};

export function getTileMaterial(uniforms = {}, zIndex: number) {
  return new RawShaderMaterial({
    ...baseOptions,
    uniforms,
    fragmentShader,
    stencilRef: zIndex + 1
  });
}

export function getTileMaterialPole(uniforms = {}, zIndex: number) {
  return new RawShaderMaterial({
    ...baseOptions,
    uniforms,
    fragmentShader: fragmentShaderPole,
    stencilRef: zIndex + 1
  });
}
