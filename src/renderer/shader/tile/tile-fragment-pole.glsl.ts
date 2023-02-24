export default `
varying vec2 vUv;
varying vec2 vUvOrig;
uniform float pole;
uniform float poleSegments;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float textureFade;

uniform float isFullSize;
uniform float x;
uniform float zoom;

void main() {
  // pole = 1 for north pole and 0 for south

  float vx = vUv.x;
  float k = 0.0;

  float columns = pow(2.0, zoom + 1.0);
  float s = (x + 0.5) * (1.0 / columns);
  float poleScale = mix(0.5, s, isFullSize);

  // north
  if (pole > 0.5) {
    k = 1.0 - 1.0 / poleSegments;

    if (vUvOrig.y > k) {
      float f = (vUvOrig.y - k) * poleSegments;
      vx = (vUv.x - poleScale) / (1.0 - f) + poleScale;
    }
  } 
  
  else {
    // south
    k = 1.0 / poleSegments;

    if (vUvOrig.y < k) {
      float f = vUvOrig.y * poleSegments;
      vx = (vUv.x - poleScale) / f + poleScale;
    }
  }

  vec4 tex0 = texture2D(texture0, vec2(vx, vUv.y));
  vec4 tex1 = texture2D(texture1, vec2(vx, vUv.y));

  gl_FragColor = mix(tex0, tex1, textureFade);
}
`;
