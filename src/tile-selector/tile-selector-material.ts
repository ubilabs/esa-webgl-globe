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

    // the maximum zoomlevel we can reliably encode in 13bit x and 12bit y
    const float maxZoomLevel = 12.0;

    void main() {
      // the extent of the map in y-direction (x is double that)
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

      uint tileX = uint(vUV.x * numTilesX);
      uint tileY = uint(vUV.y * numTilesY);

      // split MSB/LSB of tileX and tileY
      uint xMSB = uint(tileX / 256u);
      uint xLSB = tileX % 256u;
      
      uint yMSB = uint(tileY / 256u);
      uint yLSB = tileY % 256u;

      // setup flags (result, x overflow, y overflow)
      uint flags = 0x08u;
      if (xMSB > 0x1fu) 
          flags = flags | 0x04u;
      if (yMSB > 0x0fu)
          flags = flags | 0x02u;
        
      // bitsquash zoom and yMSB / flags and xMSB 
      // (using '* 16' instead of '<< 4' since bitshifting isn't implemented in GLSL)
      uint zoom_yMSB = (uint(zoom) & 0x0fu) * 16u | (yMSB & 0x0fu);
      uint flags_xMSB = (flags & 0x0eu) * 16u | (xMSB & 0x1fu);
        
      // 4 8bit output-channels:
      // - r: zzzz yyyy   zoomlevel and yMSB
      // - g: yyyy yyyy   yLSB
      // - b: fffx xxxx   flags (result|xOverflow|yOverflow) and xMSB
      // - a: xxxx xxxx   xLSB
      gl_FragColor = vec4(
        float(zoom_yMSB) / 255.0,
        float(yLSB) / 255.0,
        float(flags_xMSB) / 255.0,
        float(xLSB) / 255.0
      );
    }
  `;
}
