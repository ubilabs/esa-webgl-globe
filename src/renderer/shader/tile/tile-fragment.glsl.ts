export default `
varying vec2 vUv;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float textureFade;

void main() {
  vec4 tex0 = texture2D(texture0, vUv);
  vec4 tex1 = texture2D(texture1, vUv);
  gl_FragColor = mix(tex0, tex1, textureFade);
}
`;
