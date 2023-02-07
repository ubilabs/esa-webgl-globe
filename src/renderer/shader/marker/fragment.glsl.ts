export default `
varying vec2 vUv;
uniform sampler2D tex;
uniform vec2 size;
uniform vec2 resolution;

void main() {
  gl_FragColor = texture(tex, vUv);
}
`;
