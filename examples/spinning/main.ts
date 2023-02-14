import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerProps} from '../../src/loader/layer';

const distance = 20_000_000;

const globe = new WebGlGlobe(document.body, {
  layers: [
    {
      id: 'basemap',
      zIndex: 0,
      maxZoom: 5,
      urlParameters: {},
      getUrl: ({x, y, zoom}) =>
        `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/basemaps/colored/${zoom}/${x}/${y}.png`
    } as LayerProps<{}>
  ],
  cameraView: {lng: 0, lat: 0, distance}
});

let rot = 180;
let spinning = true;

(function spin() {
  rot += 0.1;
  const lng = (rot % 360) - 180;
  globe.setProps({cameraView: {lng, lat: 10, distance}});

  if (spinning) {
    requestAnimationFrame(spin);
  }
})();

document.body.addEventListener('mousedown', () => (spinning = false));
document.body.addEventListener('mousewheel', () => (spinning = false));
