import '../style.css';

import {WebGlGlobe, LayerProps} from '../../src';

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
  cameraView: {lng: 0, lat: 0, altitude: distance}
});

globe.setControlsInteractionEnabled( true );
globe.startAutoSpin(1);

setTimeout(() => {
  globe.stopAutoSpin();
}, 2000);
