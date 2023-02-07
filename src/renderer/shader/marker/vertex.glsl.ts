export default `
varying vec2 vUv;
uniform vec2 lngLat;
uniform vec2 size;
uniform vec2 resolution;
uniform vec2 offset;
uniform vec2 anchor;

void main() {
    float PI = 3.141592653589793;
    vec2 lngLatRad = lngLat * PI / 180.0;
    float lng = lngLatRad.x;
    float lat = lngLatRad.y;

    // calculate position from lngLat
    float py = sin(lat);
    float cf = sqrt(1.0 - pow(py, 2.0));
    float xSphere = sin(lng / 2.0) * cf;
    float zSphere = cos(lng / 2.0) * cf;
    float ySphere = py;
    vec4 spherePos = vec4(xSphere, ySphere, zSphere, 1.0);
    vec4 screenPos = projectionMatrix * modelViewMatrix * spherePos;

    // Position attributes here do not describe the actual position but the offsets
    // we add to each vertex starting from the calculated screen position.
    // In addition we add the anchor and pixel offset values.
    vec2 vertexOffset = (position.xy + anchor) * (size / resolution) + (offset / resolution * 2.0) ;

    gl_Position = vec4((screenPos.xy + vertexOffset * screenPos.w), screenPos.z, screenPos.w);

    vUv = position.xy / 2.0 + 0.5;
}
`;
