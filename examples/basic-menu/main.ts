import '../style.css';

import {WebGlGlobe, LayerProps} from '../../src';

const distance = 22584000;
const nav = document.querySelector<HTMLDivElement>('.nav');

// Here we instantiate the globe like in FE app

if (nav) {
  if (window.innerWidth <= 767) {
    nav.style.width = '100%';
  } else {
    nav.style.width = Math.min(window.innerWidth / 2, window.innerHeight - 60) + 'px';
  }
}

const globeContainer = document.querySelector<HTMLDivElement>('#globe-container');
const globe = new WebGlGlobe(globeContainer!, {
  renderOptions: {
    atmosphereEnabled: true,
    shadingEnabled: true,
    atmosphereStrength: 0.8,
    atmosphereColor: [0.58, 0.79, 1] // {r: 148, g: 201, b: 255}
  },
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
  cameraView: {lng: 0, lat: 0, altitude: distance, isAnimated: false}
});

globe.setControlsInteractionEnabled(true);
globe.startAutoSpin(1);

