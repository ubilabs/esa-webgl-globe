import {IUniform, ShaderMaterial} from 'three';

type TileSelectionMaterialUniforms = {
  downscaleFactor: IUniform<number>;
  tilesize: IUniform<number>;
};

export class TileSelectionMaterial extends ShaderMaterial {
  uniforms: TileSelectionMaterialUniforms = {
    downscaleFactor: {value: 0.25},
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
    uniform float downscaleFactor;
    uniform float tilesize;

    varying vec2 vUV;

    const float maxZoomLevel = 7.0;

    void main() {
      float extent = tilesize * exp2(maxZoomLevel + 1.0);

      // pixel coordinates within a virtual texture assumed to be 
      vec2 virtualTexCoordPx = vUV * extent;

      // those are the change rates of the virtual texture
      vec2 dVtcDx = dFdx(virtualTexCoordPx) * downscaleFactor;
      vec2 dVtcDy = dFdy(virtualTexCoordPx) * downscaleFactor;

      // dot(v, v) is essentially the squared length of vector v (the square part of this
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
