import '../style.css';

import {WebGlGlobe, LayerProps} from '../../src';

const distance = 20_000_000;

const globe = new WebGlGlobe(document.getElementById('globe')!, {
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

globe.startAutoSpin(0.1, true);

const flyToButton = document.getElementById('fly-to')!;

flyToButton.addEventListener('click', () => {
  globe.setProps({
    cameraFlyTo: {
      lng: Math.random() * 360 - 180,
      lat: Math.random() * 180 - 90,
      altitude: Math.random() * 20_000_000 + 2_000_000,
      duration: 2000,
      onAfterFly: () => {console.log('Fly to completed');}
    }
  });
});
