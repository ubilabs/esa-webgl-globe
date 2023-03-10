import {IUniform, ShaderMaterial} from 'three';

type TileSelectionMaterialUniforms = {
  renderScale: IUniform<number>;
  subsamplingFactor: IUniform<number>;
  tilesize: IUniform<number>;
};

/**
 * The TileSelectorMaterial renders the optimal tile for every fragment based on the
 * texture-coordinate derivatives.
 */
export class TileSelectionMaterial extends ShaderMaterial {
  uniforms: TileSelectionMaterialUniforms = {
    /**
     * RenderScale is the scaling of the viewport, by default we render at a quarter of the original
     * size.
     */
    renderScale: {value: 0.25},
    /**
     * Additional scaling for subsampling to improve performance and reduce the number of tiles to
     * load
     */
    subsamplingFactor: {value: 1.0},
    tilesize: {value: 256.0}
  };

  defines = {
    // DEBUG: true,
  };

  //language=GLSL
  vertexShader = `
    varying vec2 vUV;

    void main() {
      vUV = vec2(uv.x, uv.y);
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `;

  //language=GLSL
  fragmentShader = `
    precision highp float;

    uniform float renderScale;
    uniform float subsamplingFactor;
    uniform float tilesize;

    varying vec2 vUV;

    // the maximum zoomlevel we can reliably encode in the 8bit tile-index
    const float maxZoomLevel = 7.0;

    void main() {
      float extent = tilesize * exp2(maxZoomLevel);

      // pixel coordinates within a virtual texture assumed to be covering the whole 
      // earth at maxZoomLevel
      vec2 virtualTexCoordPx = vUV * extent;

      // those are the change rates of the pixel-coordinate along the screen 
      // x- and y-axes
      vec2 dVtcDx = dFdx(virtualTexCoordPx) * renderScale * subsamplingFactor;
      vec2 dVtcDy = dFdy(virtualTexCoordPx) * renderScale * subsamplingFactor;

      // dot(v, v) is the squared length of vector v (the square part of this
      // is compensated for after getting the logarithm). This is essentially the total 
      // distance in texture coordinates from one screen pixel to the next, computed both 
      // in screen x and y directions. 
      float d = max(dot(dVtcDx, dVtcDx), dot(dVtcDy, dVtcDy));
      float zoom = min(maxZoomLevel, maxZoomLevel - floor(0.5 * log2(d)));

      float numTilesX = exp2(zoom + 1.0);
      float numTilesY = exp2(zoom);

      float tileX = floor(vUV.x * numTilesX);
      float tileY = floor(vUV.y * numTilesY);

      gl_FragColor = vec4(
        tileX / 255.0,
        tileY / 255.0,
        zoom / 255.0,
        1.0
      );

      // 4 8bit output-channels: 
      //  - r: x tile coordinate (up to zoom 8)
      //  - g: y tile coordinate (up to zoom 8)
      //  - b: tile zoomlevel
      //  - a: indicate if there is data here
    }
  `;
}
