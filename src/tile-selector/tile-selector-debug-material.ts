import {ShaderMaterial, Texture} from 'three';

export class TileSelectionDebugMaterial extends ShaderMaterial {
  uniforms: {buf: {value: Texture | null}} = {
    buf: {value: null}
  };

  //language=GLSL
  vertexShader = `
    varying vec2 vUV;

    void main() {
      vUV = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `;

  //language=GLSL
  fragmentShader = `
    uniform sampler2D buf;
    varying vec2 vUV;

    void main() {
      vec4 rgba = texture2D(buf, vUV);

      float tileX = rgba.r * 255.0;
      float tileY = rgba.g * 255.0;
      float zoom = rgba.b * 255.0;
      float alpha = rgba.a;

      float numTilesX = exp2(zoom + 1.0);
      float numTilesY = exp2(zoom);

      gl_FragColor = vec4(
        tileX / numTilesX,
        tileY / numTilesY,
        zoom / 8.0,
        alpha
      );

      // 4 8bit output-channels: 
      //  - r: x tile coordinate (up to zoom 8)
      //  - g: y tile coordinate (up to zoom 8)
      //  - b: tile zoomlevel
      //  - a: indicate if there is data here
    }
  `;
}
