import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerDebugMode} from '../../src/loader/types/layer';
import type {LayerProps} from '../../src/loader/types/layer';

let basemapProps = {
  id: 'basemap',
  // debug: true,
  debugMode: LayerDebugMode.OVERLAY,
  zIndex: 0,
  maxZoom: 4,
  urlParameters: {},
  getUrl: ({x, y, zoom}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.1/basemaps/land/${zoom}/${x}/${y}.png`
} as LayerProps;

let permafrostProps = {
  id: 'permafrost.pfr',
  debug: true,
  debugMode: LayerDebugMode.OVERLAY,
  urlParameters: {timestep: 0},
  zIndex: 1,
  maxZoom: 4,
  getUrl: ({x, y, zoom, timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.6.5/permafrost.pfr/tiles/${timestep}/${zoom}/${x}/${y}.png`
} as LayerProps<{timestep: number}>;

let layers = [basemapProps, permafrostProps];

const globe = new WebGlGlobe(document.body, {layers: layers});

const timeslider = document.querySelector('.timeslider input') as HTMLInputElement;
const valueDisplay = document.querySelector('.timeslider .value-display') as HTMLElement;
const prevBtn = document.querySelector('#timestep-prev') as HTMLElement;
const nextBtn = document.querySelector('#timestep-next') as HTMLElement;

function setTimestamp(value: number) {
  timeslider.value = String(value);
  valueDisplay.textContent = String(value);

  globe.setProps({
    layers: [
      basemapProps,
      {
        ...permafrostProps,
        urlParameters: {timestep: value}
      } as LayerProps<{timestep: number}>
    ]
  });
}

prevBtn.addEventListener('click', () => {
  setTimestamp(Math.max(0, timeslider.valueAsNumber - 1));
});

nextBtn.addEventListener('click', () => {
  setTimestamp(Math.min(Number(timeslider.max), timeslider.valueAsNumber + 1));
});

timeslider.addEventListener('input', () => {
  setTimestamp(timeslider.valueAsNumber);
});

// @ts-ignore
const stats = globe.scheduler.stats;
// @ts-ignore
window.stats = stats;
// @ts-ignore
window.globe = globe;
