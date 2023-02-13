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
      vUV = vec2(uv.x, 1.0 - uv.y);
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

    // the maximum zoomlevel we can reliably handle with single precision
    // (highp) float while still being able to tell single pixels apart 
    // (max safe integer is 2^24-1). 
    // We could possibly go up to zoomlevel 22 or 23, since we don't actually 
    // need exact pixel-coordinates here, just the tile-index.
    const float maxZoomLevel = 15.0;

    void main() {
      float extent = tilesize * exp2(maxZoomLevel);

      // pixel coordinates within a virtual texture assumed to be covering the whole 
      // earth 
      vec2 virtualTexCoordPx = vUV * extent;

      // those are the change rates of the uv-coordinate along the fragment 
      // x- and y-axes
      vec2 dVtcDx = dFdx(virtualTexCoordPx) * renderScale * subsamplingFactor;
      vec2 dVtcDy = dFdy(virtualTexCoordPx) * renderScale * subsamplingFactor;

      // dot(v, v) is the squared length of vector v (the square part of this
      // is compensated for after getting the logarithm). This is essentially the total 
      // distance in texture coordinates from one screen pixel to the next, computed both 
      // in screen x and y directions. 
      float d = max(dot(dVtcDx, dVtcDx), dot(dVtcDy, dVtcDy));
      float zoom = maxZoomLevel - floor(0.5 * log2(d));

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

      // debug version
      #ifdef DEBUG
        gl_FragColor = vec4(
          tileX / numTilesX,
          tileY / numTilesY,
          zoom / maxZoomLevel,
          1.0
        );
      #endif

      // 4 8bit output-channels: 
      //  - r: x tile coordinate (up to zoom 8)
      //  - g: y tile coordinate (up to zoom 8)
      //  - b: tile zoomlevel
      //  - a: indicate if there is data here
    }
  `;
}
