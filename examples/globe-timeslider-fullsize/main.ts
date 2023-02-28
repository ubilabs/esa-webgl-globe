import '../style.css';

import {WebGlGlobe} from '../../src/webgl-globe';
import {LayerDebugMode} from '../../src/loader/types/layer';
import type {LayerProps} from '../../src/loader/types/layer';

let basemapProps: LayerProps = {
  id: 'basemap',
  zIndex: 0,
  maxZoom: 4,
  type: 'tile',
  urlParameters: {},
  getUrl: ({x, y, zoom}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.1/basemaps/land/${zoom}/${x}/${y}.png`
};

let sstProps: LayerProps<{timestep: number}> = {
  id: 'sst.analysed_sst',
  debug: true,
  debugMode: LayerDebugMode.OVERLAY,
  urlParameters: {timestep: 0},
  zIndex: 1,
  maxZoom: 4,
  type: 'image',
  getUrl: ({timestep}) =>
    `https://storage.googleapis.com/esa-cfs-tiles/1.9.0/sst.analysed_sst/tiles/${timestep}/full.png`
};

let layers = [basemapProps, sstProps];

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
        ...sstProps,
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
