export default `
varying vec2 vUv;
varying vec2 vUvOrig;
varying float columns;
uniform float x;
uniform float y;
uniform float zoom;
uniform float projection;
uniform float size;
uniform float isFullSize;

void main() {
  float PI = 3.141592653589793;

  columns = pow(2.0, zoom + 1.0);
  float rows = pow(2.0, zoom);

  // use normal 0...1 uv coords for tiles
  vec2 tiledUvs = position.xy / 2.0 + 0.5;

  // divide uv coords by tile count and offset by tile position
  vec2 fullSizeUvs = tiledUvs / vec2(columns, rows) + vec2(x / columns, y / rows);

  vUv = mix(tiledUvs, fullSizeUvs, isFullSize);
  vUvOrig = tiledUvs;

  /*
   * Transform position so that:
   * position.x goes from -1...1
   * position.y goes from -0.5...0.5
   * position.z = 0
   */
  vec3 newPosition = (vec3(x / columns, y / rows, 0.0) - vec3(0.5)) * vec3(2.0, 1.0, 0.0);

  // add offset for every single vertex so that the quads vertices lie around the tile's center
  vec3 vertexOffset = (position / 2.0 + 0.5) * (2.0 / columns);
  newPosition += vertexOffset;

  // lat/lng
  float lng = newPosition.x * PI * 2.0;
  float lat = newPosition.y * PI;

  // sphere
  float py = sin(lat);
  float cf = sqrt(1.0 - pow(py, 2.0));
  float xSphere = sin(lng / 2.0) * cf;
  float zSphere = cos(lng / 2.0) * cf;
  float ySphere = py;
  vec4 spherePos = vec4(xSphere, ySphere, zSphere, 1.0);

  // equirectangular
  float xEqui = newPosition.x * 2.0;
  float yEqui = newPosition.y * 2.0;
  vec4 equiPos = vec4(xEqui, yEqui, 0.0, 1.0);

  vec4 finalPos = mix(spherePos, equiPos, projection);

  gl_Position = projectionMatrix * modelViewMatrix * finalPos;
}
`;
