export default `
varying vec2 vUv;
uniform float index;
uniform float zoom;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float textureFade;
uniform float colorChange;

void main() {
  float columns = pow(2.0, zoom + 1.0);
  float rows = pow(2.0, zoom);
  float r = floor(index / columns) / rows;
  float c = mod(index, columns) / columns;

  vec4 tex0 = texture2D(texture0, vUv);
  vec4 tex1 = texture2D(texture1, vUv);

  gl_FragColor = mix(tex0, tex1, textureFade);
  gl_FragColor = mix(gl_FragColor, gl_FragColor.grba, colorChange);
}
`
