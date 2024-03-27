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

    // the maximum zoomlevel we can reliably encode in 12bit
    const float maxZoomLevel = 11.0;

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

      uint flags = 0x8u;
        
      // 4 upper bytes of tileX and tileY
      uint tileXmsb = uint(tileX / 256u);
      uint tileYmsb = uint(tileY / 256u);
      // bitsquash them together
      uint tileXYmsb = (tileXmsb & 0x0fu) * 16u | (tileYmsb & 0x0fu);

      // fixme: could add x/y overflow flags
      
      uint tileXlsb = tileX % 256u;
      uint tileYlsb = tileY % 256u;

      uint zoomFlags = uint(zoom) + flags * 16u;
        
      // 4 8bit output-channels:
      //  - r: xxxx yyyy   tile coordinate MSB (x and y combined, allows up to zoomlevel 11)
      //  - g: xxxx xxxx   tile coordinate LSB
      //  - b: yyyy yyyy   tile coordinate LSB
      //  - a: 1000 zzzz   tile zoomlevel
      gl_FragColor = vec4(
        float(tileXYmsb) / 255.0,
        float(tileXlsb) / 255.0,
        float(tileYlsb) / 255.0,
        float(zoomFlags) / 255.0
      );

      
    }
  `;
}
