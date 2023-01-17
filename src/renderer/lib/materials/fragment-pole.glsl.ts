export default `
varying vec2 vUv;
uniform float pole;
uniform float poleSegments;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float textureFade;

void main() {
  // pole = 1 for north pole and 0 for south

  float x = vUv.x;
  float k = 0.0;

  // north
  if (pole > 0.5) {
    k = 1.0 - 1.0 / poleSegments;

    if (vUv.y > k) {
      float f = (vUv.y - k) * poleSegments;
      x = (vUv.x - 0.5) / (1.0 - f) + 0.5;
    }
  } else {
    // south
    k = 1.0 / poleSegments;

    if (vUv.y < k) {
      float f = vUv.y * poleSegments;
      x = (vUv.x - 0.5) / f + 0.5;
    }
  }

  vec4 tex0 = texture2D(texture0, vec2(x, vUv.y));
  vec4 tex1 = texture2D(texture1, vec2(x, vUv.y));

  gl_FragColor = mix(tex0, tex1, textureFade);
}
`;